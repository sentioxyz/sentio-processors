import { OrderbookProcessor } from "./types/fuel/OrderbookProcessor.js";
import { FuelNetwork } from "@sentio/sdk/fuel";

OrderbookProcessor.bind({
  chainId: FuelNetwork.TEST_NET,
  address: '0x0f0c1065a7b82d026069c5cf070b21ee65713fd1ac92ec1d25eacc3100187f78'
})
    // .onCallMatch_orders(async (order, ctx) => {
    //   for (const log of order.getLogsOfTypeTradeEvent()) {
    //     // record trade event
    //   }
    // })
    .onLogTradeEvent(async (trade, ctx) => {
        const vol = trade.data.trade_price.mul(trade.data.trade_size).scaleDown(2 * 10)
        ctx.eventLogger.emit('trade', {
          distinctId: ctx.transaction?.sender,
          ...trade,
          vol: vol
        })
    })
    .onLogOrderChangeEvent(async (order, ctx) => {
      ctx.eventLogger.emit('order', {
        distinctId: ctx.transaction?.sender,
        ...order,
      })
    })
    .onLogMarketCreateEvent(async (market, ctx) => {
        ctx.eventLogger.emit('market', {
          distinctId: ctx.transaction?.sender,
          ...market
        })
    })
    // .onCallOpen_order(async (order, ctx) => {
    //   ctx.eventLogger.emit('openOrder', {
    //     distinctId: ctx.transaction?.sender,
    //   })
    // })
