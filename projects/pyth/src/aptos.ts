import { pyth, event, price } from "./types/aptos/pyth.js";
import { Counter, Gauge } from "@sentio/sdk";
import { PRICE_MAP } from "./pyth.js";
import { BigDecimal } from "@sentio/sdk";
import { console_v1 } from "./types/aptos/pyth2.js";
import { pyth as pyth_new, event as event_new, price as price_new } from "./types/aptos/0xbd6d205f2aa288baa71270e66716d3d1bafe173ab9f312de4e9dd761ddef5409.js";

import LRU from 'lru-cache'

const commonOptions = { sparse: true }
const priceGauage = Gauge.register("price", commonOptions)
const priceEMAGauage = Gauge.register("price_ema", commonOptions)

const updates = Counter.register("update")
const updateWithFunder = Counter.register("update_price_feeds_with_funder")
const message = Counter.register("message")
const messages2 = Counter.register("mint_with_pyth_and_price")

// more migration
const evmPriceGauage = Gauge.register("evm_price_unsafe", commonOptions)
const price_update_occur = Gauge.register("price_update_occur", commonOptions)
const price_update_counter = Counter.register("price_update_counter", {
  resolutionConfig: {
    intervalInMinutes: 1,
  }
})


const cache = new LRU<bigint, any>({
  maxSize: 5000,
  sizeCalculation: (value, key) => {
    return 1
  },
})

event.bind()
  .onEventPriceFeedUpdate((evt, ctx) => {
    if (!cache.has(ctx.version)) {
      message.add(ctx, 1)
      cache.set(ctx.version, {})
    }

    const priceId = evt.data_decoded.price_feed.price_identifier.bytes
    const symbol = PRICE_MAP.get(priceId) || "not listed"
    var isNative

    if (priceId == "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5") {
      isNative = "true"
    } else {
      isNative = "false"
    }
    const labels = { priceId, symbol, isNative }

    priceGauage.record(ctx, getPrice(evt.data_decoded.price_feed.price), labels)
    // migration
    evmPriceGauage.record(ctx, getPrice(evt.data_decoded.price_feed.price), labels)
    priceEMAGauage.record(ctx,  getPrice(evt.data_decoded.price_feed.ema_price), labels)
    updates.add(ctx, 1, labels)
    //migration
    price_update_counter.add(ctx, ctx.getTimestamp(), labels)
    price_update_occur.record(ctx, 1, labels)
    // ctx.meter.Counter("price_update_counter").add(1, labels)
  })
// TODO: temp comment out for debugging
// pyth.bind()
//   .onEntryUpdatePriceFeedsWithFunder((call, ctx) => {
//     updateWithFunder.add(ctx, 1)
//   })

// console_v1.bind().onEntryMintWithPythAndPrice((evt, ctx) => {
//   messages2.add(ctx, 1)
// })
// TODO: temp comment out for

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