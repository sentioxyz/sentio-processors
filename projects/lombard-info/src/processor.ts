import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal, Gauge } from "@sentio/sdk";
import {
  EthChainId,
  EthContext,
  GlobalProcessor,
  isNullAddress,
} from "@sentio/sdk/eth";
import { getEACAggregatorProxyContractOnContext } from "@sentio/sdk/eth/builtin/eacaggregatorproxy";
import {
  BTC_USD_PRICE_FEED,
  CORN_SILO,
  creationBlocks,
  CURVE_LBTC_WBTC,
  CURVE_TRI_BTC,
  DECIMALS,
  EBTC,
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
  PTLBTC_USD_PRICE_FEED,
  SATLAYER_POOL,
  SATLAYER_TOKEN_LIST,
  SYMBIOTIC_LBTC,
  WBTC,
  WBTC_BTC_PRICE_FEED,
  ZEROLEND_LBTC,
  ZEROLEND_PT_LBTC,
  ZIRCUIT_POOL,
} from "./config.js";
import { getMetaMorphoContractOnContext } from "./types/eth/metamorpho.js";
import { getMorphoContractOnContext } from "./types/eth/morpho.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";
import { getPoolV3ContractOnContext } from "./types/eth/poolv3.js";
import { getBoringVaultContractOnContext } from "./types/eth/boringvault.js";
import { getATokenContractOnContext } from "./types/eth/atoken.js";
import { getDeriveVaultTokenContractOnContext } from "./types/eth/derivevaulttoken.js";
import { getCurrentVaultAmount } from "./derive-helper.js";
import { getPriceBySymbol } from "@sentio/sdk/utils";
import { getPTLBTCDec262024OracleContractOnContext } from "./types/eth/ptlbtcdec262024oracle.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};
const ETH_STARTBLOCK = 20614590;

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
const ZerolendPTLBTCTVL = Gauge.register("zerolendPTLBTCTVL");

const CurveLBTCWBTCTVL = Gauge.register("curve_lbtc_wbtc_tvl");
const CurveTriBTCTVL = Gauge.register("curve_tri_btc_tvl");

GlobalProcessor.bind({
  network: NETWORK,
  startBlock: ETH_STARTBLOCK,
}).onTimeInterval(
  async (_, ctx) => {
    const [
      btcPrice,
      lbtcPrice,
      wbtcPrice,
      morphoGauntletTVL,
      morphoRe7TVL,
      morphoMarketInfo,
      symbioticTVL,
      gearboxInfo,
      etherfiTVL,
      zircuitTVL,
      zircuitLBTCTVL,
      satlayerTVL,
      satlayerLBTCTVL,
      pellTVL,
      etherfiLBTCTVL,
      karakTVL,
      cornLBTCTVL,
      pendleTVL,
      zerolendTVL,
      zerolendPTLBTCTVL,
      curveLBTCWBTCTVL,
      curveTriBTCTVL,
    ] = await Promise.all([
      getBTCPrice(ctx),
      getLBTCPrice(ctx),
      getWBTCPrice(ctx),
      getMorphoVaultTVL(ctx, MORPHO_GAUNTLET),
      getMorphoVaultTVL(ctx, MORPHO_RE7),
      getMorphoMarketInfo(ctx),
      getSymbioticTVL(ctx),
      getGearboxInfo(ctx),
      getEtherfiTVL(ctx),
      getZircuitTVL(ctx),
      getSimpleLBTCTVL(ctx, ZIRCUIT_POOL),
      getSatlayerTVL(ctx),
      getSimpleLBTCTVL(ctx, SATLAYER_POOL),
      getSimpleLBTCTVL(ctx, PELL_LBTC_STRATEGY),
      getSimpleLBTCTVL(ctx, ETHERFI_VAULT),
      getSimpleLBTCTVL(ctx, KARAK_LBTC),
      getSimpleLBTCTVL(ctx, CORN_SILO),
      getPendleTVL(ctx),
      getZerolendTVL(ctx),
      getZerolendPTLBTCTVL(ctx),
      getCurvePoolTVL(ctx, CURVE_LBTC_WBTC),
      getCurvePoolTVL(ctx, CURVE_TRI_BTC),
    ]);

    gaugeBTCPrice.record(ctx, btcPrice);
    gaugeLBTCPrice.record(ctx, lbtcPrice);
    gaugeWBTCPrice.record(ctx, wbtcPrice);
    MorphoGauntletTVL.record(ctx, morphoGauntletTVL);
    MorphoRe7TVL.record(ctx, morphoRe7TVL);
    MorphoMarketSupply.record(ctx, morphoMarketInfo.supply);
    MorphoMarketBorrow.record(ctx, morphoMarketInfo.borrow);
    SymbioticTVL.record(ctx, symbioticTVL);
    GearboxSupply.record(ctx, gearboxInfo.supply);
    GearboxBorrow.record(ctx, gearboxInfo.borrow);
    EtherfiTVL.record(ctx, etherfiTVL);
    ZircuitTVL.record(ctx, zircuitTVL);
    ZircuitLBTCTVL.record(ctx, zircuitLBTCTVL);
    SatlayerTVL.record(ctx, satlayerTVL);
    SatlayerLBTCTVL.record(ctx, satlayerLBTCTVL);
    PellTVL.record(ctx, pellTVL);
    EtherfiLBTCTVL.record(ctx, etherfiLBTCTVL);
    KarakTVL.record(ctx, karakTVL);
    CornLBTCTVL.record(ctx, cornLBTCTVL);
    PendleTVL.record(ctx, pendleTVL);
    ZerolendTVL.record(ctx, zerolendTVL);
    ZerolendPTLBTCTVL.record(ctx, zerolendPTLBTCTVL);
    CurveLBTCWBTCTVL.record(ctx, curveLBTCWBTCTVL);
    CurveTriBTCTVL.record(ctx, curveTriBTCTVL);
  },
  10,
  60
);

async function getBTCPrice(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[BTC_USD_PRICE_FEED]) {
    return 0;
  }
  const p = await getEACAggregatorProxyContractOnContext(
    ctx,
    BTC_USD_PRICE_FEED
  ).latestAnswer();
  return Number(p) / 1e8;
}

async function getLBTCPrice(ctx: EthContext) {
  const lbtcPrice = await getPriceBySymbol("lbtc", ctx.timestamp);
  return lbtcPrice ?? 0;
}

async function getPTLBTCPrice(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[PTLBTC_USD_PRICE_FEED]) {
    return 0;
  }
  const p = await getPTLBTCDec262024OracleContractOnContext(
    ctx,
    PTLBTC_USD_PRICE_FEED
  ).usdPrice();

  return Number(p) / 1e8;
}

async function getWBTCPrice(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[WBTC_BTC_PRICE_FEED]) {
    return 0;
  }
  const p = await getEACAggregatorProxyContractOnContext(
    ctx,
    WBTC_BTC_PRICE_FEED
  ).latestAnswer();
  const btc_usd = await getBTCPrice(ctx);
  return (btc_usd * Number(p)) / 1e8;
}

async function getEBTCPrice(ctx: EthContext) {
  // TODO
  return getWBTCPrice(ctx);
}

async function getMorphoVaultTVL(ctx: EthContext, vault: string) {
  if (ctx.blockNumber <= creationBlocks[vault]) {
    return 0;
  }
  const c = getMetaMorphoContractOnContext(ctx, vault);
  const [totalAssets, wbtcPrice] = await Promise.all([
    c.totalAssets(),
    getWBTCPrice(ctx),
  ]);
  return (Number(totalAssets) / 1e8) * wbtcPrice;
}

async function getMorphoMarketInfo(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[MORPHO]) {
    return { supply: 0, borrow: 0 };
  }
  const c = getMorphoContractOnContext(ctx, MORPHO);
  const [{ totalSupplyAssets, totalBorrowAssets }, wbtcPrice] =
    await Promise.all([c.market(MORPHO_MARKET_ID), getWBTCPrice(ctx)]);
  return {
    supply: (Number(totalSupplyAssets) / 1e8) * wbtcPrice,
    borrow: (Number(totalBorrowAssets) / 1e8) * wbtcPrice,
  };
}

async function getSymbioticTVL(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[SYMBIOTIC_LBTC]) {
    return 0;
  }
  const c = getERC20ContractOnContext(ctx, SYMBIOTIC_LBTC);
  const [totalSupply, lbtcPrice] = await Promise.all([
    c.totalSupply(),
    getLBTCPrice(ctx),
  ]);
  return (Number(totalSupply) / 1e8) * lbtcPrice;
}

async function getGearboxInfo(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[GEARBOX_WBTC_POOL]) {
    return { supply: 0, borrow: 0 };
  }
  const c = getPoolV3ContractOnContext(ctx, GEARBOX_WBTC_POOL);
  const [totalAssets, totalBorrow, wbtcPrice] = await Promise.all([
    c.totalAssets(),
    c.totalBorrowed(),
    getWBTCPrice(ctx),
  ]);
  return {
    supply: (Number(totalAssets) / 1e8) * wbtcPrice,
    borrow: (Number(totalBorrow) / 1e8) * wbtcPrice,
  };
}

// async function getEtherfiTVL(ctx: EthContext) {
//   if (ctx.blockNumber <= creationBlocks[LBTC]) {
//     return 0;
//   }
//   // amount of LBTC locked in the vault
//   const c = getERC20ContractOnContext(ctx, LBTC);
//   const [balance, lbtcPrice] = await Promise.all([
//     c.balanceOf(ETHERFI_VAULT),
//     getLBTCPrice(ctx),
//   ]);
//   return (Number(balance) / 1e8) * lbtcPrice;
// }

async function getEtherfiTVL(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[ETHERFI_VAULT]) {
    return 0;
  }
  const c = getBoringVaultContractOnContext(ctx, ETHERFI_VAULT);
  const [totalSupply, btcPrice] = await Promise.all([
    c.totalSupply(),
    getBTCPrice(ctx),
  ]);
  return (Number(totalSupply) / 1e8) * btcPrice;
}

async function getSimpleLBTCTVL(ctx: EthContext, address: string) {
  if (
    ctx.blockNumber < creationBlocks[address] ||
    ctx.blockNumber < creationBlocks[LBTC]
  ) {
    return 0;
  }
  const c = getBoringVaultContractOnContext(ctx, LBTC);
  const [lbtcBalance, lbtcPrice] = await Promise.all([
    c.balanceOf(address),
    getLBTCPrice(ctx),
  ]);
  return (Number(lbtcBalance) / 1e8) * lbtcPrice;
}

async function getZircuitTVL(ctx: EthContext) {
  const res = await fetch("https://app.zircuit.com/api/stats");
  const body = await res.json();
  return Number(body.totalValueLocked);
}

async function getSatlayerTVL(ctx: EthContext) {
  let btcTotal = 0;
  for (const addr of SATLAYER_TOKEN_LIST) {
    if (ctx.blockNumber < creationBlocks[addr]) {
      continue;
    }
    btcTotal +=
      Number(
        await getERC20ContractOnContext(ctx, addr).balanceOf(SATLAYER_POOL)
      ) /
      10 ** DECIMALS[addr];
  }
  const btcPrice = await getBTCPrice(ctx);
  return btcTotal * btcPrice;
}

async function getPendleTVL(ctx: EthContext) {
  if (ctx.blockNumber < creationBlocks[PENDLE_SY]) {
    return 0;
  }
  const c = getERC20ContractOnContext(ctx, PENDLE_SY);
  const [lbtcBalance, lbtcPrice] = await Promise.all([
    c.totalSupply(),
    getLBTCPrice(ctx),
  ]);
  return (Number(lbtcBalance) / 1e8) * lbtcPrice;
}

async function getZerolendTVL(ctx: EthContext) {
  if (ctx.blockNumber < creationBlocks[ZEROLEND_LBTC]) {
    return 0;
  }
  const c = getATokenContractOnContext(ctx, ZEROLEND_LBTC);
  const [lbtcBalance, lbtcPrice] = await Promise.all([
    c.scaledTotalSupply(),
    getLBTCPrice(ctx),
  ]);
  return (Number(lbtcBalance) / 1e8) * lbtcPrice;
}

async function getZerolendPTLBTCTVL(ctx: EthContext) {
  if (ctx.blockNumber <= creationBlocks[ZEROLEND_PT_LBTC]) {
    return 0;
  }
  const c = getATokenContractOnContext(ctx, ZEROLEND_PT_LBTC);
  const [lbtcBalance, ptLbtcPrice] = await Promise.all([
    c.scaledTotalSupply(),
    getPTLBTCPrice(ctx),
  ]);

  return (Number(lbtcBalance) / 1e8) * ptLbtcPrice;
}

const DeriveMaxiTVL = Gauge.register("derive_maxi_tvl");
const DeriveHarvestTVL = Gauge.register("derive_harvest_tvl");

GlobalProcessor.bind({
  network: EthChainId.ETHEREUM,
  startBlock: ETH_STARTBLOCK,
}).onTimeInterval(
  async (_, ctx) => {
    const [deriveMaxiTVL, deriveHarvestTVL] = await Promise.all([
      getDeriveMaxiTVL(ctx),
      getDeriveHarvestTVL(ctx),
    ]);

    DeriveMaxiTVL.record(ctx, deriveMaxiTVL);
    DeriveHarvestTVL.record(ctx, deriveHarvestTVL);
  },
  10,
  60
);

async function getDeriveMaxiTVL(ctx: EthContext) {
  const [vaultAmount, lbtcPrice] = await Promise.all([
    ctx.blockNumber >= creationBlocks[LBTCCPS_DERIVE]
      ? getCurrentVaultAmount(ctx, LBTCCPS_DERIVE)
      : 0n,
    getLBTCPrice(ctx),
  ]);
  return Number(vaultAmount) * lbtcPrice;
}

async function getDeriveHarvestTVL(ctx: EthContext) {
  const [vaultAmount, lbtcPrice] = await Promise.all([
    ctx.blockNumber >= creationBlocks[LBTCCS_DERIVE]
      ? getCurrentVaultAmount(ctx, LBTCCS_DERIVE)
      : 0n,
    getLBTCPrice(ctx),
  ]);
  return Number(vaultAmount) * lbtcPrice;
}

const priceGetter: Record<string, (ctx: EthContext) => Promise<number>> = {
  [LBTC]: getLBTCPrice,
  [WBTC]: getWBTCPrice,
  [EBTC]: getEBTCPrice,
};

async function getCurvePoolTVL(ctx: EthContext, address: string) {
  if (ctx.blockNumber < creationBlocks[address]) {
    return 0;
  }
  let ret = 0;
  for (const token of [WBTC, LBTC, EBTC]) {
    const balance =
      ctx.blockNumber >= creationBlocks[token]
        ? await getERC20ContractOnContext(ctx, token).balanceOf(address)
        : 0n;
    const price = await priceGetter[token](ctx);
    ret += (Number(balance) / 1e8) * price;
  }
  return ret;
}
