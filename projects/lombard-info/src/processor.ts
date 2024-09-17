import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal, Gauge } from "@sentio/sdk";
import { EthChainId, EthContext, GlobalProcessor, isNullAddress } from "@sentio/sdk/eth";
import { getEACAggregatorProxyContractOnContext } from "@sentio/sdk/eth/builtin/eacaggregatorproxy";
import {
  BTC_USD_PRICE_FEED,
  CORN_SILO,
  creationBlocks,
  DECIMALS,
  ETHERFI_VAULT,
  GEARBOX_WBTC_POOL,
  KARAK_LBTC,
  LBTC,
  LBTCCPS_DERIVE,
  LBTCCS_DERIVE,
  MORPHO,
  MORPHO_GAUNTLET,
  MORPHO_MARKET_ID,
  MORPHO_RE7,
  NETWORK,
  PELL_LBTC_STRATEGY,
  PENDLE_SY,
  SATLAYER_POOL,
  SATLAYER_TOKEN_LIST,
  SYMBIOTIC_LBTC,
  WBTC_BTC_PRICE_FEED,
  ZEROLEND_LBTC,
  ZIRCUIT_POOL,
} from "./config.js"
import { getMetaMorphoContractOnContext } from "./types/eth/metamorpho.js";
import { getMorphoContractOnContext } from "./types/eth/morpho.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";
import { getPoolV3ContractOnContext } from "./types/eth/poolv3.js";
import { getBoringVaultContractOnContext } from "./types/eth/boringvault.js";
import { getATokenContractOnContext } from "./types/eth/atoken.js";
import { getDeriveVaultTokenContractOnContext } from "./types/eth/derivevaulttoken.js";
import { getCurrentVaultAmount } from "./derive-helper.js";
import { getPriceBySymbol } from "@sentio/sdk/utils";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const gaugeBTCPrice = Gauge.register("btc_price");
const gaugeLBTCPrice = Gauge.register("lbtc_price");
const gaugeWBTCPrice = Gauge.register("wbtc_price");
const MorphoGauntletTVL = Gauge.register("morpho_gauntlet_tvl");
const MorphoRe7TVL = Gauge.register("morpho_re7_tvl");
const MorphoMarketSupply = Gauge.register("morpho_market_supply");
const MorphoMarketBorrow = Gauge.register("morpho_market_borrow");
const SymbioticTVL = Gauge.register("symbiotic_tvl");
const GearboxSupply = Gauge.register("gearbox_supply");
const GearboxBorrow = Gauge.register("gearbox_borrow");
const EtherfiTVL = Gauge.register("etherfi_tvl");

const ZircuitTVL = Gauge.register("zircuit_tvl");
const ZircuitLBTCTVL = Gauge.register("zircuit_lbtc_tvl");
const SatlayerTVL = Gauge.register("satlayer_tvl");
const SatlayerLBTCTVL = Gauge.register("satlayer_lbtc_tvl");
const PellTVL = Gauge.register("pell_tvl");
const EtherfiLBTCTVL = Gauge.register("etherfi_lbtc_tvl");
const KarakTVL = Gauge.register("karak_tvl");
const CornLBTCTVL = Gauge.register("corn_lbtc_tvl");
const PendleTVL = Gauge.register("pendle_tvl");
const ZerolendTVL = Gauge.register("zerolend_tvl");

// GlobalProcessor.bind({
//   network: NETWORK,
//   startBlock: 20440000,
// }).onTimeInterval(
//   async (_, ctx) => {
//     const [
//       btcPrice,
//       lbtcPrice,
//       wbtcPrice,
//       morphoGauntletTVL,
//       morphoRe7TVL,
//       morphoMarketInfo,
//       symbioticTVL,
//       gearboxInfo,
//       etherfiTVL,
//       zircuitTVL,
//       zircuitLBTCTVL,
//       satlayerTVL,
//       satlayerLBTCTVL,
//       pellTVL,
//       etherfiLBTCTVL,
//       karakTVL,
//       cornLBTCTVL,
//       pendleTVL,
//       zerolendTVL,
//     ] = await Promise.all([
//       getBTCPrice(ctx),
//       getLBTCPrice(ctx),
//       getWBTCPrice(ctx),
//       getMorphoVaultTVL(ctx, MORPHO_GAUNTLET),
//       getMorphoVaultTVL(ctx, MORPHO_RE7),
//       getMorphoMarketInfo(ctx),
//       getSymbioticTVL(ctx),
//       getGearboxInfo(ctx),
//       getEtherfiTVL(ctx),
//       getZircuitTVL(ctx),
//       getSimpleLBTCTVL(ctx, ZIRCUIT_POOL),
//       getSatlayerTVL(ctx),
//       getSimpleLBTCTVL(ctx, SATLAYER_POOL),
//       getSimpleLBTCTVL(ctx, PELL_LBTC_STRATEGY),
//       getSimpleLBTCTVL(ctx, ETHERFI_VAULT),
//       getSimpleLBTCTVL(ctx, KARAK_LBTC),
//       getSimpleLBTCTVL(ctx, CORN_SILO),
//       getPendleTVL(ctx),
//       getZerolendTVL(ctx),
//     ]);

//     gaugeBTCPrice.record(ctx, btcPrice);
//     gaugeLBTCPrice.record(ctx, lbtcPrice);
//     gaugeWBTCPrice.record(ctx, wbtcPrice);
//     MorphoGauntletTVL.record(ctx, morphoGauntletTVL);
//     MorphoRe7TVL.record(ctx, morphoRe7TVL);
//     MorphoMarketSupply.record(ctx, morphoMarketInfo.supply);
//     MorphoMarketBorrow.record(ctx, morphoMarketInfo.borrow);
//     SymbioticTVL.record(ctx, symbioticTVL);
//     GearboxSupply.record(ctx, gearboxInfo.supply);
//     GearboxBorrow.record(ctx, gearboxInfo.borrow);
//     EtherfiTVL.record(ctx, etherfiTVL);
//     ZircuitTVL.record(ctx, zircuitTVL);
//     ZircuitLBTCTVL.record(ctx, zircuitLBTCTVL);
//     SatlayerTVL.record(ctx, satlayerTVL);
//     SatlayerLBTCTVL.record(ctx, satlayerLBTCTVL);
//     PellTVL.record(ctx, pellTVL);
//     EtherfiLBTCTVL.record(ctx, etherfiLBTCTVL);
//     KarakTVL.record(ctx, karakTVL);
//     CornLBTCTVL.record(ctx, cornLBTCTVL);
//     PendleTVL.record(ctx, pendleTVL);
//     ZerolendTVL.record(ctx, zerolendTVL);
//   },
//   10,
//   60
// );

// async function getBTCPrice(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[BTC_USD_PRICE_FEED]) {
//     return 0;
//   }
//   const p = await getEACAggregatorProxyContractOnContext(
//     ctx,
//     BTC_USD_PRICE_FEED
//   ).latestAnswer();
//   return Number(p) / 1e8;
// }

async function getLBTCPrice(ctx: EthContext) {
  ctx.eventLogger.emit("debuglog5", {
    t: ctx.timestamp
  })
  return getPriceBySymbol("lbtc", ctx.timestamp)
}

// async function getWBTCPrice(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[WBTC_BTC_PRICE_FEED]) {
//     return 0;
//   }
//   const p = await getEACAggregatorProxyContractOnContext(
//     ctx,
//     WBTC_BTC_PRICE_FEED
//   ).latestAnswer();
//   const btc_usd = await getBTCPrice(ctx);
//   return (btc_usd * Number(p)) / 1e8;
// }

// async function getMorphoVaultTVL(ctx: EthContext, vault: string) {
//   if (ctx.blockNumber <= creationBlocks[vault]) {
//     return 0;
//   }
//   const c = getMetaMorphoContractOnContext(ctx, vault);
//   const [totalAssets, wbtcPrice] = await Promise.all([
//     c.totalAssets(),
//     getWBTCPrice(ctx),
//   ]);
//   return (Number(totalAssets) / 1e8) * wbtcPrice;
// }

// async function getMorphoMarketInfo(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[MORPHO]) {
//     return { supply: 0, borrow: 0 };
//   }
//   const c = getMorphoContractOnContext(ctx, MORPHO);
//   const [{ totalSupplyAssets, totalBorrowAssets }, wbtcPrice] =
//     await Promise.all([c.market(MORPHO_MARKET_ID), getWBTCPrice(ctx)]);
//   return {
//     supply: (Number(totalSupplyAssets) / 1e8) * wbtcPrice,
//     borrow: (Number(totalBorrowAssets) / 1e8) * wbtcPrice,
//   };
// }

// async function getSymbioticTVL(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[SYMBIOTIC_LBTC]) {
//     return 0;
//   }
//   const c = getERC20ContractOnContext(ctx, SYMBIOTIC_LBTC);
//   const [totalSupply, lbtcPrice] = await Promise.all([
//     c.totalSupply(),
//     getLBTCPrice(ctx),
//   ]);
//   return (Number(totalSupply) / 1e8) * lbtcPrice;
// }

// async function getGearboxInfo(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[GEARBOX_WBTC_POOL]) {
//     return { supply: 0, borrow: 0 };
//   }
//   const c = getPoolV3ContractOnContext(ctx, GEARBOX_WBTC_POOL);
//   const [totalAssets, totalBorrow, wbtcPrice] = await Promise.all([
//     c.totalAssets(),
//     c.totalBorrowed(),
//     getWBTCPrice(ctx),
//   ]);
//   return {
//     supply: (Number(totalAssets) / 1e8) * wbtcPrice,
//     borrow: (Number(totalBorrow) / 1e8) * wbtcPrice,
//   };
// }

// // async function getEtherfiTVL(ctx: EthContext) {
// //   if (ctx.blockNumber <= creationBlocks[LBTC]) {
// //     return 0;
// //   }
// //   // amount of LBTC locked in the vault
// //   const c = getERC20ContractOnContext(ctx, LBTC);
// //   const [balance, lbtcPrice] = await Promise.all([
// //     c.balanceOf(ETHERFI_VAULT),
// //     getLBTCPrice(ctx),
// //   ]);
// //   return (Number(balance) / 1e8) * lbtcPrice;
// // }

// async function getEtherfiTVL(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[ETHERFI_VAULT]) {
//     return 0;
//   }
//   const c = getBoringVaultContractOnContext(ctx, ETHERFI_VAULT);
//   const [totalSupply, btcPrice] = await Promise.all([
//     c.totalSupply(),
//     getBTCPrice(ctx),
//   ]);
//   return (Number(totalSupply) / 1e8) * btcPrice;
// }

// async function getSimpleLBTCTVL(ctx: EthContext, address: string) {
//   if (
//     ctx.blockNumber < creationBlocks[address] ||
//     ctx.blockNumber < creationBlocks[LBTC]
//   ) {
//     return 0;
//   }
//   const c = getBoringVaultContractOnContext(ctx, LBTC);
//   const [lbtcBalance, lbtcPrice] = await Promise.all([
//     c.balanceOf(address),
//     getLBTCPrice(ctx),
//   ]);
//   return (Number(lbtcBalance) / 1e8) * lbtcPrice;
// }

// async function getZircuitTVL(ctx: EthContext) {
//   const res = await fetch("https://app.zircuit.com/api/stats");
//   const body = await res.json();
//   return Number(body.totalValueLocked);
// }

// async function getSatlayerTVL(ctx: EthContext) {
//   let btcTotal = 0;
//   for (const addr of SATLAYER_TOKEN_LIST) {
//     if (ctx.blockNumber < creationBlocks[addr]) {
//       continue;
//     }
//     btcTotal +=
//       Number(
//         await getERC20ContractOnContext(ctx, addr).balanceOf(SATLAYER_POOL)
//       ) /
//       10 ** DECIMALS[addr];
//   }
//   const btcPrice = await getBTCPrice(ctx);
//   return btcTotal * btcPrice;
// }

// async function getPendleTVL(ctx: EthContext) {
//   if (ctx.blockNumber < creationBlocks[PENDLE_SY]) {
//     return 0;
//   }
//   const c = getERC20ContractOnContext(ctx, PENDLE_SY);
//   const [lbtcBalance, lbtcPrice] = await Promise.all([
//     c.totalSupply(),
//     getLBTCPrice(ctx),
//   ]);
//   return (Number(lbtcBalance) / 1e8) * lbtcPrice;
// }

// async function getZerolendTVL(ctx: EthContext) {
//   if (ctx.blockNumber < creationBlocks[ZEROLEND_LBTC]) {
//     return 0;
//   }
//   const c = getATokenContractOnContext(ctx, ZEROLEND_LBTC);
//   const [lbtcBalance, lbtcPrice] = await Promise.all([
//     c.scaledTotalSupply(),
//     getLBTCPrice(ctx),
//   ]);
//   return (Number(lbtcBalance) / 1e8) * lbtcPrice;
// }


const DeriveMaxiTVL = Gauge.register("derive_maxi_tvl")
const DeriveHarvestTVL = Gauge.register("derive_harvest_tvl")


GlobalProcessor.bind({
  network: EthChainId.ETHEREUM,
  startBlock: 20764260
}).onTimeInterval(
  async (_, ctx) => {
    ctx.eventLogger.emit("debuglog8", {
      b: ctx.blockNumber,
      t: ctx.timestamp
    })

    const [
      deriveMaxiTVL,
      deriveHarvestTVL
    ] = await Promise.all([
      getDeriveMaxiTVL(ctx),
      getDeriveHarvestTVL(ctx)
    ]);

    DeriveMaxiTVL.record(ctx, deriveMaxiTVL)
    DeriveHarvestTVL.record(ctx, deriveHarvestTVL)
  },
  1,
  60
);

async function getDeriveMaxiTVL(ctx: EthContext) {

  ctx.eventLogger.emit("debuglog6", {
    b: ctx.blockNumber,
    t: ctx.timestamp
  })


  const [vaultAmount, lbtcPrice] = await Promise.all([
    getCurrentVaultAmount(ctx, LBTCCPS_DERIVE),
    getLBTCPrice(ctx),
  ])
  ctx.eventLogger.emit("debuglog2", {
    vaultAmount, lbtcPrice
  })
  if (!lbtcPrice) return 0
  return Number(vaultAmount) * lbtcPrice
}

async function getDeriveHarvestTVL(ctx: EthContext) {
  ctx.eventLogger.emit("debuglog7", {
    b: ctx.blockNumber,
    t: ctx.timestamp
  })

  const [vaultAmount, lbtcPrice] = await Promise.all([
    getCurrentVaultAmount(ctx, LBTCCS_DERIVE),
    getLBTCPrice(ctx),
  ])
  ctx.eventLogger.emit("debuglog3", {
    vaultAmount, lbtcPrice
  })
  if (!lbtcPrice) return 0
  return Number(vaultAmount) * lbtcPrice
}

