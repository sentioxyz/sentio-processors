import { OrderbookProcessor } from "./types/fuel/OrderbookProcessor.js";
import { FuelNetwork } from "@sentio/sdk/fuel";

OrderbookProcessor.bind({
  chainId: FuelNetwork.TEST_NET,
  address: '0x4a2ce054e3e94155f7092f7365b212f7f45105b74819c623744ebcc5d065c6ac'
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
