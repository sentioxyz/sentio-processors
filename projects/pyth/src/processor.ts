import { pyth, event, price } from "./types/aptos/pyth";
import { Counter, Gauge } from "@sentio/sdk";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { PRICE_MAP } from "./pyth";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { console_v1 } from "./types/aptos/pyth2";

import LRU from 'lru-cache'

const commonOptions = { sparse: true }
const priceGauage = new Gauge("price", commonOptions)
const priceEMAGauage = new Gauge("price_ema", commonOptions)

const updates = new Counter("update")
const updateWithFunder = new Counter("update_price_feeds_with_funder")
const message = new Counter("message")
const messages2 = new Counter("mint_with_pyth_and_price")

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
    const labels = { priceId, symbol }

    priceGauage.record(ctx, getPrice(evt.data_typed.price_feed.price), labels)
    priceEMAGauage.record(ctx,  getPrice(evt.data_typed.price_feed.ema_price), labels)
    updates.add(ctx, 1, labels)
  })

pyth.bind()
  .onEntryUpdatePriceFeedsWithFunder((call, ctx) => {
    updateWithFunder.add(ctx, 1)
  })

console_v1.bind().onEntryMintWithPythAndPrice((evt, ctx) => {
  messages2.add(ctx, 1)
})

function getPrice(p: price.Price) {
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