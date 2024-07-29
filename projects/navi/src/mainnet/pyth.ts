import { SuiObjectProcessor } from "@sentio/sdk/sui"
import {
  SuiContext,
  SuiObjectContext,
} from "@sentio/sdk/sui"
import { Counter, Gauge, MetricOptions } from "@sentio/sdk";
import { ChainId } from "@sentio/chain"
import { COIN_MAP, SymbolMatcher } from "./utils.js";
import { event, price } from "../types/sui/0x04e20ddf36af412a4096f9014f4a565af9e812db9a05cc40254846cf6ed0ad91.js";
import { PRICE_MAP } from "./pyth_map.js";
import { BigDecimal, AggregationType } from "@sentio/sdk";

const commonOptions: MetricOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [1],
    types: [AggregationType.LAST]
  }
}
// const priceGauage = Gauge.register("pyth_price", commonOptions)
// const priceEMAGauage = Gauge.register("pyth_price_ema", commonOptions)
// const evmPriceGauage = Gauge.register("pyth_evm_price_unsafe", commonOptions)
// const price_update_occur = Gauge.register("pyth_price_update_occur", commonOptions)
// const price_update_counter = Counter.register("pyth_price_update_counter", {
//   resolutionConfig: {
//     intervalInMinutes: 5,
//   }
// })
function decodeBytesArray(bytes: number[]): string {
  return "0x" + Buffer.from(bytes).toString("hex")
}

export function getPrice(p: price.Price) {
  let expo = p.expo.magnitude.asBigDecimal()
  if (p.expo.negative) {
    expo = expo.negated()
  }
  let base = p.price.magnitude.asBigDecimal()
  if (p.price.negative) {
    base = base.negated()
  }
  return base.multipliedBy(BigDecimal(10).exponentiatedBy(expo))
}

async function onPriceUpdateEvent(event: event.PriceFeedUpdateEventInstance, ctx: SuiContext) {

  const priceId = decodeBytesArray(event.data_decoded.price_feed.price_identifier.bytes)
  const symbol = PRICE_MAP.get(priceId) || "not listed"
  var isNative

  if (priceId == "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744") {
    isNative = "true"
  } else {
    isNative = "false"
  }
  // if (symbol != "not listed") {
  //   const labels = { priceId, symbol, isNative }
  //   priceGauage.record(ctx, getPrice(event.data_decoded.price_feed.price), labels)

  // }
  // evmPriceGauage.record(ctx, getPrice(event.data_decoded.price_feed.price), labels)
  // priceEMAGauage.record(ctx, getPrice(event.data_decoded.price_feed.ema_price), labels)
  // price_update_occur.record(ctx, 1, labels)
  // price_update_counter.add(ctx, 1, labels)
}

export function PythOracleProcessor() {
  event.bind({ startCheckpoint: 7800000n })
    .onEventPriceFeedUpdateEvent(onPriceUpdateEvent)
}