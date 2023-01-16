import { pyth, event, price } from "./types/aptos/pyth";
import { Counter, Gauge } from "@sentio/sdk";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { PRICE_MAP } from "./pyth";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { console_v1 } from "./types/aptos/pyth2";

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

    const priceId = evt.data_typed.price_feed.price_identifier.bytes
    const symbol = PRICE_MAP.get(priceId) || "not listed"
    var isNative
    
    if (priceId == "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5") {
      isNative = "true"
    } else {
      isNative = "false"
    }
    const labels = { priceId, symbol, isNative }

    priceGauage.record(ctx, getPrice(evt.data_typed.price_feed.price), labels)
    // migration
    evmPriceGauage.record(ctx, getPrice(evt.data_typed.price_feed.price), labels)
    priceEMAGauage.record(ctx,  getPrice(evt.data_typed.price_feed.ema_price), labels)
    updates.add(ctx, 1, labels)
    //migration
    price_update_occur.record(ctx, 1, labels)
    ctx.meter.Counter("price_update_counter").add(1, labels)
  })

pyth.bind()
  .onEntryUpdatePriceFeedsWithFunder((call, ctx) => {
    updateWithFunder.add(ctx, 1)
  })

console_v1.bind().onEntryMintWithPythAndPrice((evt, ctx) => {
  messages2.add(ctx, 1)
})

export function getPrice(p: price.Price) {
  let expo = toBigDecimal(p.expo.magnitude)
  if (p.expo.negative) {
    expo = expo.negated()
  }
  let base = toBigDecimal(p.price.magnitude)
  if (p.price.negative) {
    base = base.negated()
  }
  return base.multipliedBy(BigDecimal(10).exponentiatedBy(expo))
}