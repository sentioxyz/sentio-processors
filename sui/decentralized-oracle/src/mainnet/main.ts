import { SuiContext, SuiObjectContext } from "@sentio/sdk/sui";
import { oracle_pro, oracle } from "../types/sui/0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83.js";
import { getAllTokenData } from "./oracle.js";

const feedMap: { [key: string]: string } = {
  "0x2cab9b151ca1721624b09b421cc57d0bb26a1feb5da1f821492204b098ec35c9": "SuiFeed",
  "0x70a79226dda5c080378b639d1bb540ddea64761629aa4ad7355d79266d55af61": "wUSDCFeed",
  "0xf72d8933873bb4e5bfa1edbfa9ff6443ec5fac25c1d99ba2ef37f50a125826f3": "USDTFeed",
  "0x44d92366eba1f1652ec81f34585406726bef267565a2db1664ffd5ef18e21693": "WETHFeed",
  "0x5ac98fc1e6723af2a6d9a68a5d771654a6043f9c4d2b836b2d5fb4832a3be4f2": "CETUSFeed",
  "0x086bb5540047b3c77ae5e2f9b811c7ef085517a73510f776753c8ee83d19e62c": "vSuiFeed",
  "0xac934a2a2d406085e7f73b460221fe1b11935864605ba58cdbb8e21c15f12acd": "haSuiFeed",
  "0x4324c797d2f19eff517c24adec8b92aa2d282e44f3a5cafb36d6c4b30d7f2dca": "NAVXFeed",
  "0x1bf4727242a61d892feef6616d3e40a3bd24b64b5deb884054e86cb9360556c4": "WBTCFeed",
  "0x9a0656e1e10a0cdf3f03dce9db9ad931f51dc6eac2e52ebfbf535dfbcf8100ef": "AUSDFeed",
  "0xe120611435395f144b4bcc4466a00b6b26d7a27318f96e148648852a9dd6b31c": "NUSDCFeed",
  "0x9a6ffc707270286e98e8d0f654ce38f69efbc302ac98e2deb11fbad2211600f0": "ETHFeed",
  "0x726c16dbac0301602428e76f21517a1dede492713fb0ce9cea05e4e568548cf0": "USDYFeed",
  "0xc771ec0ca245857f30195ce05197a7b3ab41c58c1e8abe0661919d90675ad63d": "NSFeed",
  "0xdf9b254a7a64742e1edf8c48bd2a1f182b52f020de2ab070ae0e3f9228d05280": "LORENZOBTCFeed",
  "0x4558092b08ad1b33b0eb536f91a4655693c2390ac568f06de6f6fad827888600": "DEEPFeed",
  "0xafc60c431991869d34659872a313e32bd3fc602f8e0adba1d8904f3b63f3bc58": "FDUSDFeed",
  "0xd8286c11df7e49496ee75622ae4132c56385c30b4bedb392e36c0699a52a1d52": "BULEFeed",
  "0x93c1b815f64ef7c4311d74ff7c0ca1e47739c3ac31fdee0068c30887633ba2fb": "BUCKFeed",
  "0xdeba21105ff41300f8829aaeba45fdec25d1533a64d504ef0348ff005da3fbe5": "SUIUSDTFeed",
  "0xd7a8c920db9f8b5c3c300307d88fca53684fd15b760977dbf8f0adc6e55783bd": "STSUIFeed",
  "0x4e4666c82c476f0b51b27c5ed8c77ab960aa5e4c3a48796e179d721b471e3b7e": "SUIBTCFeed",
  "0x2611dff736233a6855e28ae95f8e5f62a6bf80653ddb118bf012fd783d530fa1": "SOLFeed",
  "0x8ee4d9d61d0bfa342cdb3ee8b7f047c91f0b586e0ff66fd6e8fc761e235e5409": "LBTCFeed",
};

function getFeedName(address: string) {
  return feedMap[address] || "Address not found";
}

async function invalidOraclePriceHandler(event: oracle_pro.InvalidOraclePriceInstance, ctx: SuiContext) {
  ctx.eventLogger.emit("invalidOraclePrice", {
    config_address: event.data_decoded.config_address,
    feed_address: event.data_decoded.feed_address,
    provider: event.data_decoded.provider,
    price: event.data_decoded.price,
    maximum_effective_price: event.data_decoded.maximum_effective_price,
    minmum_effective_price: event.data_decoded.minimum_effective_price,
    maximum_allowed_span: event.data_decoded.maximum_allowed_span,
    current_timestamp: event.data_decoded.current_timestamp,
    historical_price_ttl: event.data_decoded.historical_price_ttl,
    historical_price: event.data_decoded.historical_price,
    historical_updated_time: event.data_decoded.historical_updated_time,
  });
}

async function priceRegHandler(event: oracle_pro.PriceRegulationInstance, ctx: SuiContext) {
  ctx.eventLogger.emit("PriceRegulation", {
    level: event.data_decoded.level,
    config_address: event.data_decoded.config_address,
    feed_address: event.data_decoded.feed_address,
    price_diff_threshold1: event.data_decoded.price_diff_threshold1,
    price_diff_threshold2: event.data_decoded.price_diff_threshold2,
    current_time: event.data_decoded.current_time,
    diff_threshold2_timer: event.data_decoded.diff_threshold2_timer,
    max_duration_within_threshold: event.data_decoded.max_duration_within_thresholds,
    primary_price: event.data_decoded.primary_price,
    secondary_price: event.data_decoded.secondary_price,
  });
}

async function oracleUnavailableHandler(event: oracle_pro.OracleUnavailableInstance, ctx: SuiContext) {
  ctx.eventLogger.emit("OracleUnavailable", {
    config_address: event.data_decoded.config_address,
    feed_address: event.data_decoded.feed_address,
    type: event.data_decoded.type,
    provider: event.data_decoded.provider,
    price: event.data_decoded.price,
    updated_time: event.data_decoded.updated_time,
    feedName: getFeedName(event.data_decoded.feed_address),
  });

  const data = await getAllTokenData(ctx);
  ctx.eventLogger.emit("PriceFeedsUnavailable", {
    triggered_token_price_feed: event.data_decoded.feed_address,
    updated_time: event.data_decoded.updated_time,
    Sui_Price: data[0].price,
    Sui_updated_time: data[0].updated_time,
    USDC_Price: data[1].price,
    USDC_updated_time: data[1].updated_time,
    USDT_Price: data[2].price,
    USDT_updated_time: data[2].updated_time,
  });
}

async function oraclePriceHandler(event: oracle.PriceUpdatedInstance, ctx: SuiContext) {
  // const data = await getAllTokenData();
  // ctx.eventLogger.emit("priceFeedsEvent", {
  //     updated_time: event.data_decoded.update_at,
  //     Sui_Price: data[0].price,
  //     Sui_updated_time: data[0].updated_time,
  //     USDC_Price: data[1].price,
  //     USDC_updated_time: data[1].updated_time,
  //     USDT_Price: data[2].price,
  //     USDT_updated_time: data[2].updated_time
  // })

  ctx.eventLogger.emit("priceUpdated", {
    id: event.data_decoded.id,
    price_oracle: event.data_decoded.price_oracle,
    price: event.data_decoded.price,
    last_price: event.data_decoded.last_price,
    update_at: event.data_decoded.update_at,
    last_update_at: event.data_decoded.last_update_at,
    timestampDiff: event.data_decoded.update_at - event.data_decoded.last_update_at,
  });
}

oracle_pro
  .bind({ startCheckpoint: 39539450n })
  .onEventPriceRegulation(priceRegHandler)
  .onEventInvalidOraclePrice(invalidOraclePriceHandler)
  .onEventOracleUnavailable(oracleUnavailableHandler);

oracle.bind({ startCheckpoint: 39539450n }).onEventPriceUpdated(oraclePriceHandler);
