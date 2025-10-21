// import { SuiObjectProcessor } from "@sentio/sdk/sui";
// import { ChainId } from "@sentio/chain";
// import { VAULT_ADDRESSES } from "./utils.js";

// const BASE_URL = "https://vault-api.volosui.com/api/v1";

// // Removed duplicate check mechanism, switched to overwrite strategy
// // const processedTimestamps = new Set<string>();

// // Get the list of past 7 days
// function getPast7Days(): string[] {
//   const dates = [];
//   for (let i = 0; i < 7; i++) {
//     const date = new Date();
//     date.setDate(date.getDate() - i);
//     dates.push(date.toISOString().split("T")[0]);
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
//         // Fetch vault list
//         const listResp = await fetch(`${BASE_URL}/vaults`);
//         if (!listResp.ok) throw new Error(`GET /vaults -> ${listResp.status}`);
//         const listJson = (await listResp.json()) as VaultListResponse;

//         // Parse and record vault list data
//         console.log(
//           `🔍 Processing ${listJson.data.length} vaults at ${ctx.timestamp.toISOString()}`
//         );
//         for (const vault of listJson.data) {
//           // Convert status to number to match existing schema
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
//             vault: vault.id,
//             vaultName: vault.name || "Unknown",
//             apy7d: Number(vault.apy7d?.value) || 0,
//             apy30d: Number(vault.apy30d?.value) || 0,
//             instantAPR: Number(vault.instantAPR) || 0,
//             totalStaked: Number(vault.totalStaked) || 0,
//             totalStakedUsd: String(vault.totalStakedUsd || "0"),
//             exchangeRate: Number(vault.exchangeRate) || 0,
//             status: statusValue,
//             statusText: String(vault.status || "unknown"),
//             timestamp: ctx.timestamp.toISOString(),
//             data_source: "volo_api",
//           };

//           console.log(
//             `📊 VaultMetrics: ${vault.name} - APY7d:${vaultMetricsData.apy7d} APY30d:${vaultMetricsData.apy30d} InstantAPR:${vaultMetricsData.instantAPR}`
//           );
//           ctx.eventLogger.emit("backendRecord", vaultMetricsData);

//           // Record current instant APY every 10 minutes
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

//         // Fetch past 7 days historical data for each vault (overwrite)
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

//               // Overwrite handling: fetch all historical data and rewrite each time
//               console.log(
//                 `📈 Found ${histJson.data?.length || 0} historical data points for ${vaultName}`
//               );

//               if (histJson.data && Array.isArray(histJson.data)) {
//                 let processedCount = 0;

//                 for (const dataPoint of histJson.data) {
//                   const dataTimestamp = dataPoint.timestamp;
//                   const dataDate = dataTimestamp.split("T")[0];

//                   // Only process data within the past 7 days
//                   if (past7Days.includes(dataDate)) {
//                     // Parse APY value (strip %)
//                     const apyValue = parseFloat(dataPoint.apy.replace("%", ""));

//                     // Validate data
//                     if (isNaN(apyValue)) {
//                       console.log(
//                         `⚠️ APY parsing failed: raw="${dataPoint.apy}" for ${vaultName} on ${dataDate}`
//                       );
//                       continue;
//                     }

//                     // Get current apy7d and apy30d from vault list
//                     const currentVault = listJson.data.find(
//                       (v) => v.id === vault
//                     );

//                     const historicalData = {
//                       event_type: "VoloHistoricalAPY",
//                       vault_id: vault,
//                       vault: vault,
//                       vaultName: vaultName,
//                       apy: apyValue,
//                       apyRaw: dataPoint.apy,
//                       apy7d: Number(currentVault?.apy7d?.value) || 0,
//                       apy30d: Number(currentVault?.apy30d?.value) || 0,
//                       instantAPR: Number(currentVault?.instantAPR) || 0,
//                       dataDate: dataDate,
//                       timestamp: dataTimestamp,
//                       originalTimestamp: dataTimestamp,
//                       processingTimestamp: ctx.timestamp.toISOString(),
//                       data_source: "volo_api_historical_daily",
//                     };

//                     // Overwrite on each run; do not check duplicates
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
//   );
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
