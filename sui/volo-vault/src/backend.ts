// import { SuiObjectProcessor } from "@sentio/sdk/sui";
// import { ChainId } from "@sentio/chain";
// import { VAULT_ADDRESSES } from "./utils.js";

// const BASE_URL = "https://vault-api.volosui.com/api/v1";

// // 移除重复检查机制，改为覆盖写入策略
// // const processedTimestamps = new Set<string>(); // 不再需要

// // 获取过去7天的日期列表
// function getPast7Days(): string[] {
//   const dates = [];
//   for (let i = 0; i < 7; i++) {
//     const date = new Date();
//     date.setDate(date.getDate() - i);
//     dates.push(date.toISOString().split("T")[0]); // YYYY-MM-DD格式
//   }
//   return dates;
// }

// export function VoloApiProcessor() {
//   SuiObjectProcessor.bind({
//     objectId: VAULT_ADDRESSES.VAULT_PACKAGE_PROD,
//     network: ChainId.SUI_MAINNET,
//     startCheckpoint: 175000000n,
//   }).onTimeInterval(
//     async (self, _, ctx) => {
//       try {
//         // 获取vault列表
//         const listResp = await fetch(`${BASE_URL}/vaults`);
//         if (!listResp.ok) throw new Error(`GET /vaults -> ${listResp.status}`);
//         const listJson = (await listResp.json()) as VaultListResponse;

//         // 解析并记录vault列表数据
//         console.log(
//           `🔍 Processing ${listJson.data.length} vaults at ${ctx.timestamp.toISOString()}`
//         );
//         for (const vault of listJson.data) {
//           // 将status转换为数字类型以匹配现有schema
//           const statusValue =
//             vault.status === "open"
//               ? 1
//               : vault.status === "closed"
//                 ? 0
//                 : vault.status === "paused"
//                   ? 2
//                   : -1;

//           const vaultMetricsData = {
//             event_type: "VoloVaultMetrics",
//             vault_id: vault.id,
//             vault: vault.id, // 添加vault字段
//             vaultName: vault.name || "Unknown",
//             apy7d: Number(vault.apy7d?.value) || 0,
//             apy30d: Number(vault.apy30d?.value) || 0,
//             instantAPR: Number(vault.instantAPR) || 0,
//             totalStaked: Number(vault.totalStaked) || 0,
//             totalStakedUsd: String(vault.totalStakedUsd || "0"),
//             exchangeRate: Number(vault.exchangeRate) || 0,
//             status: statusValue, // 数字类型
//             statusText: String(vault.status || "unknown"),
//             timestamp: ctx.timestamp.toISOString(),
//             data_source: "volo_api",
//           };

//           console.log(
//             `📊 VaultMetrics: ${vault.name} - APY7d:${vaultMetricsData.apy7d} APY30d:${vaultMetricsData.apy30d} InstantAPR:${vaultMetricsData.instantAPR}`
//           );
//           ctx.eventLogger.emit("backendRecord", vaultMetricsData);

//           // 🚀 每10分钟记录当前的instant APY
//           const instantApyData = {
//             event_type: "VoloInstantAPY",
//             vault_id: vault.id,
//             vault: vault.id,
//             vaultName: vault.name || "Unknown",
//             instantAPR: Number(vault.instantAPR) || 0,
//             apy7d: Number(vault.apy7d?.value) || 0,
//             apy30d: Number(vault.apy30d?.value) || 0,
//             timestamp: ctx.timestamp.toISOString(),
//             data_source: "volo_api_instant",
//           };

//           ctx.eventLogger.emit("backendRecord", instantApyData);
//           console.log(
//             `⚡ InstantAPY: ${vault.name} - ${instantApyData.instantAPR}%`
//           );
//         }

//         // 🔄 为每个vault获取过去7天的历史数据（覆盖写入策略）
//         const past7Days = getPast7Days();
//         console.log(
//           `📅 Fetching historical data for past 7 days: ${past7Days.join(", ")}`
//         );

//         for (const v of listJson.data) {
//           const vault = v.id;
//           const vaultName = v.name || "Unknown";

//           try {
//             const histResp = await fetch(
//               `${BASE_URL}/vaults/${vault}/apy/historical?period=1d`
//             );
//             if (histResp.ok) {
//               const histJson = (await histResp.json()) as VaultHistResponse;

//               // 🎯 覆盖写入处理：获取所有历史数据，每次都重新写入
//               console.log(
//                 `📈 Found ${histJson.data?.length || 0} historical data points for ${vaultName}`
//               );

//               if (histJson.data && Array.isArray(histJson.data)) {
//                 let processedCount = 0;

//                 for (const dataPoint of histJson.data) {
//                   const dataTimestamp = dataPoint.timestamp;
//                   const dataDate = dataTimestamp.split("T")[0]; // 提取日期部分 YYYY-MM-DD

//                   // 只处理过去7天内的数据
//                   if (past7Days.includes(dataDate)) {
//                     // 解析APY值（去掉%符号）
//                     const apyValue = parseFloat(dataPoint.apy.replace("%", ""));

//                     // 🔍 数据验证
//                     if (isNaN(apyValue)) {
//                       console.log(
//                         `⚠️ APY parsing failed: raw="${dataPoint.apy}" for ${vaultName} on ${dataDate}`
//                       );
//                       continue; // 跳过无效数据
//                     }

//                     // 从vault列表中获取当前的apy7d和apy30d
//                     const currentVault = listJson.data.find(
//                       (v) => v.id === vault
//                     );

//                     const historicalData = {
//                       event_type: "VoloHistoricalAPY",
//                       vault_id: vault,
//                       vault: vault,
//                       vaultName: vaultName,
//                       apy: apyValue, // 历史APY值
//                       apyRaw: dataPoint.apy, // 原始APY字符串
//                       apy7d: Number(currentVault?.apy7d?.value) || 0, // 当前7天APY
//                       apy30d: Number(currentVault?.apy30d?.value) || 0, // 当前30天APY
//                       instantAPR: Number(currentVault?.instantAPR) || 0, // 当前即时APR
//                       dataDate: dataDate, // 保留日期字段便于查询
//                       timestamp: dataTimestamp, // 使用原始API时间戳
//                       originalTimestamp: dataTimestamp, // 保留原始时间戳（与timestamp相同）
//                       processingTimestamp: ctx.timestamp.toISOString(), // 处理时间
//                       data_source: "volo_api_historical_daily",
//                     };

//                     // 🔄 覆盖写入 - 每次都写入，不检查重复
//                     ctx.eventLogger.emit("backendRecord", historicalData);
//                     processedCount++;

//                     console.log(
//                       `🔄 Overwrite: ${vaultName} ${dataDate} - ${dataPoint.apy}`
//                     );
//                   }
//                 }

//                 console.log(
//                   `📊 ${vaultName}: ${processedCount} records overwritten (past 7 days)`
//                 );
//               }
//             } else {
//               console.log(
//                 `❌ Historical API failed for ${vaultName}: HTTP ${histResp.status}`
//               );
//             }
//           } catch (e) {
//             console.log(`❌ Historical API error for ${vaultName}:`, e);
//           }
//         }
//       } catch (e) {
//         console.log(`Main Volo API error:`, e);
//       }
//     },
//     10,
//     0
//   ); // 每10分钟查询一次，覆盖写入过去7天数据 + instant APY
// }

// interface VaultListResponse {
//   total: number;
//   data: any[];
// }

// interface VaultHistResponse {
//   vault_id: string;
//   period: string;
//   data: any[];
// }
