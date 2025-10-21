#!/usr/bin/env node

/**
 * Validator Commission Calculator
 *
 * 计算指定验证者地址的所有 StakedSui 对象的 principal 总和
 * 这个总和就是 validator commission
 *
 * Usage: node calculate_validator_commission.js <validator_address>
 */

const { execSync } = require("child_process");
const fs = require("fs");

// 配置
const CONFIG = {
  RPC_URL: "https://sui-mainnet-endpoint.blockvision.org",
  DEFAULT_VALIDATOR_ADDRESS:
    "0xb7ccff74eb345067c050f6f3d91d2def9cc89219558f5a1bdac866b2414ec248",
};

/**
 * 执行 sui client 命令
 */
function executeSuiCommand(command) {
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim();
  } catch (error) {
    console.error(`执行命令失败: ${command}`);
    console.error(`错误: ${error.message}`);
    return null;
  }
}

/**
 * 获取地址拥有的所有对象
 */
function getAddressObjects(address) {
  console.log(`🔍 查询地址 ${address} 的所有对象...`);

  const command = `sui client objects ${address} --json`;
  const result = executeSuiCommand(command);

  if (!result) {
    throw new Error("无法获取地址对象");
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    console.error("解析 JSON 失败:", error.message);
    throw error;
  }
}

/**
 * 过滤出 StakedSui 对象
 */
function filterStakedSuiObjects(objects) {
  const stakedSuiObjects = objects.filter(
    (obj) =>
      obj.data &&
      obj.data.type &&
      obj.data.type.includes("staking_pool::StakedSui")
  );

  console.log(`📊 找到 ${stakedSuiObjects.length} 个 StakedSui 对象`);
  return stakedSuiObjects;
}

/**
 * 获取 StakedSui 对象的详细信息
 */
function getStakedSuiDetails(objectId) {
  const command = `sui client object ${objectId} --json`;
  const result = executeSuiCommand(command);

  if (!result) {
    console.warn(`⚠️ 无法获取对象 ${objectId} 的详细信息`);
    return null;
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    console.warn(`⚠️ 解析对象 ${objectId} 的 JSON 失败:`, error.message);
    return null;
  }
}

/**
 * 从 StakedSui 对象中提取 principal 值
 */
function extractPrincipal(stakedSuiDetail) {
  try {
    const fields = stakedSuiDetail?.content?.fields;
    if (!fields) {
      return BigInt(0);
    }

    // StakedSui 的 principal 字段
    const principal = fields.principal || "0";

    // 确保转换为 BigInt
    return BigInt(principal.toString());
  } catch (error) {
    console.warn("提取 principal 失败:", error.message);
    return BigInt(0);
  }
}

/**
 * 计算总的 validator commission
 */
async function calculateValidatorCommission(validatorAddress) {
  console.log(`\n=== Validator Commission 计算器 ===`);
  console.log(`验证者地址: ${validatorAddress}`);
  console.log(`时间: ${new Date().toISOString()}`);
  console.log(`=================================\n`);

  try {
    // 1. 获取地址的所有对象
    const allObjects = getAddressObjects(validatorAddress);

    // 2. 过滤出 StakedSui 对象
    const stakedSuiObjects = filterStakedSuiObjects(allObjects);

    if (stakedSuiObjects.length === 0) {
      console.log("❌ 没有找到 StakedSui 对象");
      return {
        validatorAddress,
        totalCommission: "0",
        objectCount: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. 获取每个 StakedSui 对象的详细信息并计算 principal
    let totalCommission = BigInt(0);
    const results = [];

    console.log(`📝 开始处理 ${stakedSuiObjects.length} 个对象...`);

    for (let i = 0; i < stakedSuiObjects.length; i++) {
      const obj = stakedSuiObjects[i];
      const objectId = obj.data.objectId;

      console.log(`处理对象 ${i + 1}/${stakedSuiObjects.length}: ${objectId}`);

      const detail = getStakedSuiDetails(objectId);
      if (detail) {
        const principal = extractPrincipal(detail);
        totalCommission += principal;

        results.push({
          objectId,
          principal: principal.toString(),
          version: obj.data.version,
        });

        console.log(`  ✓ Principal: ${principal.toString()} SUI`);
      }

      // 添加小延迟避免请求过快
      if (i < stakedSuiObjects.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // 4. 生成报告
    const result = {
      validatorAddress,
      totalCommission: totalCommission.toString(),
      totalCommissionSui: (Number(totalCommission) / 1e9).toFixed(9),
      objectCount: stakedSuiObjects.length,
      processedCount: results.length,
      timestamp: new Date().toISOString(),
      objects: results,
    };

    console.log(`\n📊 计算完成!`);
    console.log(`总 Commission: ${result.totalCommissionSui} SUI`);
    console.log(`对象数量: ${result.objectCount}`);
    console.log(`处理成功: ${result.processedCount}`);

    return result;
  } catch (error) {
    console.error("❌ 计算失败:", error.message);
    throw error;
  }
}

/**
 * 保存结果到文件
 */
function saveResults(results, filename) {
  const filepath = `./commission_results/${filename}`;

  // 确保目录存在
  if (!fs.existsSync("./commission_results")) {
    fs.mkdirSync("./commission_results", { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`💾 结果已保存到: ${filepath}`);
}

/**
 * 主函数
 */
async function main() {
  const validatorAddress = process.argv[2] || CONFIG.DEFAULT_VALIDATOR_ADDRESS;

  if (!validatorAddress) {
    console.error("❌ 请提供验证者地址");
    console.log(
      "用法: node calculate_validator_commission.js <validator_address>"
    );
    process.exit(1);
  }

  try {
    const results = await calculateValidatorCommission(validatorAddress);

    // 保存结果
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `commission_${validatorAddress.slice(
      0,
      8
    )}_${timestamp}.json`;
    saveResults(results, filename);

    // 输出简要结果
    console.log(`\n🎯 最终结果:`);
    console.log(`Validator Commission: ${results.totalCommissionSui} SUI`);
    console.log(`原始值: ${results.totalCommission}`);

    return results;
  } catch (error) {
    console.error("❌ 程序执行失败:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  calculateValidatorCommission,
  CONFIG,
};
