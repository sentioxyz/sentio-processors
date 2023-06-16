import { SuiChainId } from "@sentio/sdk";
import { event, price } from "./types/sui/0x00b53b0f4174108627fbee72e2498b58d6a2714cded53fac537034c220d26302.js";
import { PRICE_MAP } from "./pyth.js";
import { Counter, Gauge } from "@sentio/sdk";
import { BigDecimal } from "@sentio/sdk";


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

event.bind({
    // address: "0x00b53b0f4174108627fbee72e2498b58d6a2714cded53fac537034c220d26302",
    // network: SuiChainId.SUI_MAINNET,
}).onEventPriceFeedUpdateEvent((evt, ctx) => {
    // if (!cache.has(ctx.version)) {
    //     message.add(ctx, 1)
    //     cache.set(ctx.version, {})
    //   }
  
      const priceId = decodeBytesArray(evt.data_decoded.price_feed.price_identifier.bytes)
      const symbol = PRICE_MAP.get(priceId) || "not listed"
      var isNative
  
      if (priceId == "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744") {
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
      price_update_occur.record(ctx, 1, labels)
      ctx.meter.Counter("price_update_counter").add(1, labels)
})

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

function decodeBytesArray(bytes: number[]): string {
  return "0x" + Buffer.from(bytes).toString("hex")
}