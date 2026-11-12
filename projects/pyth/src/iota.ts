import { pyth, event, price } from './types/iota/pyth.js'

import { PRICE_MAP } from './pyth.js'
import { Counter, Gauge, MetricOptions } from '@sentio/sdk'
import { BigDecimal, AggregationType } from '@sentio/sdk'
import { decodeBytesArray, getPrice } from './sui.js'

import LRU from 'lru-cache'

const commonOptions: MetricOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [1],
    types: [AggregationType.LAST]
  }
}
const priceGauage = Gauge.register('price', commonOptions)
const priceEMAGauage = Gauge.register('price_ema', commonOptions)

// const updates = Counter.register("update")
// const updateWithFunder = Counter.register("update_price_feeds_with_funder")
// const message = Counter.register("message")
// const messages2 = Counter.register("mint_with_pyth_and_price")

// more migration
const evmPriceGauage = Gauge.register('evm_price_unsafe', commonOptions)
const price_update_occur = Gauge.register('price_update_occur', commonOptions)

const price_update_counter = Counter.register('price_update_counter', {
  resolutionConfig: {
    intervalInMinutes: 5
  }
})

const cache = new LRU<bigint, any>({
  maxSize: 5000,
  sizeCalculation: (value, key) => {
    return 1
  }
})

event.bind({}).onEventPriceFeedUpdateEvent((evt, ctx) => {
  const priceId = decodeBytesArray(evt.data_decoded.price_feed.price_identifier.bytes)
  const symbol = PRICE_MAP.get(priceId) || 'not listed'
  var isNative

  if (priceId == '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744') {
    isNative = 'true'
  } else {
    isNative = 'false'
  }
  const labels = { priceId, symbol, isNative }

  priceGauage.record(ctx, getPrice(evt.data_decoded.price_feed.price), labels)
  // migration
  evmPriceGauage.record(ctx, getPrice(evt.data_decoded.price_feed.price), labels)
  priceEMAGauage.record(ctx, getPrice(evt.data_decoded.price_feed.ema_price), labels)
  // updates.add(ctx, 1, labels)
  //migration
  price_update_occur.record(ctx, ctx.timestamp.getTime(), labels)

  price_update_counter.add(ctx, 1, labels)
  // ctx.meter.Counter("price_update_counter").add(1, labels)
})
