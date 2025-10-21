#!/usr/bin/env node

/**
 * Validator Commission Publisher
 *
 * 计算 validator commission 并发布到链上合约
 *
 * Usage: node commission_publisher.js <validator_address> [oracle_id] [owner_cap_id]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 引入计算脚本
const {
  calculateValidatorCommission,
  CONFIG,
} = require("./calculate_validator_commission.js");

// 配置
const PUBLISHER_CONFIG = {
  PACKAGE_PATH: "./validator_commission",
  NETWORK: "mainnet",
  GAS_BUDGET: 100000000,
  ...CONFIG,
};

/**
 * 执行 Sui 命令
 */
function executeSuiCommand(command) {
  try {
    console.log(`执行命令: ${command}`);
    const result = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim();
  } catch (error) {
    console.error(`命令执行失败: ${command}`);
    console.error(`错误: ${error.message}`);
    throw error;
  }
}

/**
 * 部署合约包
 */
function deployPackage() {
  console.log("📦 部署 Commission Oracle 合约...");

  const command = `sui client publish ${PUBLISHER_CONFIG.PACKAGE_PATH} --gas-budget ${PUBLISHER_CONFIG.GAS_BUDGET} --json`;
  const result = executeSuiCommand(command);

  try {
    const publishResult = JSON.parse(result);
    const packageId = publishResult.objectChanges?.find(
      (change) => change.type === "published"
    )?.packageId;

    if (!packageId) {
      throw new Error("无法获取发布的包 ID");
    }

    console.log(`✅ 合约部署成功，Package ID: ${packageId}`);
    return packageId;
  } catch (error) {
    console.error("解析部署结果失败:", error.message);
    throw error;
  }
}

/**
 * 创建 Oracle
 */
function createOracle(packageId, validatorAddress, initialCommission) {
  console.log("🏗️ 创建 Commission Oracle...");

  const command =
    `sui client call ` +
    `--package ${packageId} ` +
    `--module commission_oracle ` +
    `--function create_oracle ` +
    `--args ${validatorAddress} ${initialCommission} ` +
    `--gas-budget ${PUBLISHER_CONFIG.GAS_BUDGET} --json`;

  const result = executeSuiCommand(command);

  try {
    const callResult = JSON.parse(result);

    // 从对象变化中找到创建的对象
    const oracleObject = callResult.objectChanges?.find(
      (change) =>
        change.type === "created" &&
        change.objectType?.includes("CommissionOracle")
    );

    const ownerCapObject = callResult.objectChanges?.find(
      (change) =>
        change.type === "created" && change.objectType?.includes("OwnerCap")
    );

    if (!oracleObject || !ownerCapObject) {
      throw new Error("无法找到创建的对象");
    }

    console.log(`✅ Oracle 创建成功:`);
    console.log(`   Oracle ID: ${oracleObject.objectId}`);
    console.log(`   Owner Cap ID: ${ownerCapObject.objectId}`);

    return {
      oracleId: oracleObject.objectId,
      ownerCapId: ownerCapObject.objectId,
    };
  } catch (error) {
    console.error("解析创建结果失败:", error.message);
    throw error;
  }
}

/**
 * 更新 Oracle 中的 commission
 */
function updateOracleCommission(
  packageId,
  oracleId,
  ownerCapId,
  newCommission
) {
  console.log("📝 更新 Oracle Commission...");

  const timestamp = Date.now();

  const command =
    `sui client call ` +
    `--package ${packageId} ` +
    `--module commission_oracle ` +
    `--function update_commission ` +
    `--args ${oracleId} ${ownerCapId} ${newCommission} ${timestamp} ` +
    `--gas-budget ${PUBLISHER_CONFIG.GAS_BUDGET} --json`;

  const result = executeSuiCommand(command);

  try {
    const callResult = JSON.parse(result);

    if (callResult.effects?.status?.status === "success") {
      console.log(`✅ Commission 更新成功:`);
      console.log(
        `   新值: ${newCommission} (${(newCommission / 1e9).toFixed(9)} SUI)`
      );
      console.log(`   时间戳: ${timestamp}`);
      return true;
    } else {
      throw new Error("更新失败");
    }
  } catch (error) {
    console.error("解析更新结果失败:", error.message);
    throw error;
  }
}

/**
 * 保存配置信息
 */
function saveConfig(config) {
  const configDir = "./commission_config";
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configFile = path.join(configDir, "oracle_config.json");
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(`💾 配置已保存到: ${configFile}`);
}

/**
 * 加载配置信息
 */
function loadConfig() {
  const configFile = "./commission_config/oracle_config.json";
  if (fs.existsSync(configFile)) {
    try {
      return JSON.parse(fs.readFileSync(configFile, "utf-8"));
    } catch (error) {
      console.warn("加载配置文件失败:", error.message);
    }
  }
  return null;
}

/**
 * 主函数
 */
async function main() {
  const validatorAddress =
    process.argv[2] || PUBLISHER_CONFIG.DEFAULT_VALIDATOR_ADDRESS;
  const oracleId = process.argv[3];
  const ownerCapId = process.argv[4];

  console.log("=== Validator Commission Publisher ===");
  console.log(`验证者地址: ${validatorAddress}`);
  console.log(`时间: ${new Date().toISOString()}`);
  console.log("=====================================\n");

  try {
    // 1. 计算当前的 validator commission
    console.log("🔢 步骤 1: 计算 Validator Commission");
    const commissionData = await calculateValidatorCommission(validatorAddress);

    if (!commissionData || commissionData.totalCommission === "0") {
      throw new Error("无法计算 validator commission 或结果为 0");
    }

    console.log(`计算完成: ${commissionData.totalCommissionSui} SUI\n`);

    // 转换为链上格式（去掉小数点，保持 9 位精度）
    const commissionForChain = BigInt(
      commissionData.totalCommission
    ).toString();

    let packageId, currentOracleId, currentOwnerCapId;

    // 2. 检查是否已有配置
    const existingConfig = loadConfig();

    if (oracleId && ownerCapId) {
      // 使用命令行提供的参数
      packageId = existingConfig?.packageId;
      currentOracleId = oracleId;
      currentOwnerCapId = ownerCapId;

      if (!packageId) {
        throw new Error("需要先部署合约或提供 package ID");
      }
    } else if (existingConfig) {
      // 使用已保存的配置
      packageId = existingConfig.packageId;
      currentOracleId = existingConfig.oracleId;
      currentOwnerCapId = existingConfig.ownerCapId;
      console.log("📄 使用已保存的配置");
    } else {
      // 首次运行，需要部署合约和创建 Oracle
      console.log("🚀 步骤 2: 部署合约");
      packageId = deployPackage();

      console.log("🏗️ 步骤 3: 创建 Oracle");
      const oracleInfo = createOracle(
        packageId,
        validatorAddress,
        commissionForChain
      );
      currentOracleId = oracleInfo.oracleId;
      currentOwnerCapId = oracleInfo.ownerCapId;

      // 保存配置
      const config = {
        packageId,
        oracleId: currentOracleId,
        ownerCapId: currentOwnerCapId,
        validatorAddress,
        createdAt: new Date().toISOString(),
      };
      saveConfig(config);

      console.log("✅ 初始设置完成\n");
      return;
    }

    // 3. 更新 Oracle
    console.log("📝 步骤 4: 更新 Oracle Commission");
    updateOracleCommission(
      packageId,
      currentOracleId,
      currentOwnerCapId,
      commissionForChain
    );

    console.log("\n🎉 Commission 发布完成!");
    console.log("================================");
    console.log(`Package ID: ${packageId}`);
    console.log(`Oracle ID: ${currentOracleId}`);
    console.log(`Commission: ${commissionData.totalCommissionSui} SUI`);
    console.log(`更新时间: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("❌ 发布失败:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  deployPackage,
  createOracle,
  updateOracleCommission,
  PUBLISHER_CONFIG,
};
