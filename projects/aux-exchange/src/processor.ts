import { amm } from './types/aptos/auxexchange.js'
import {  Gauge, scaleDown } from "@sentio/sdk";

import { AptosDex, getCoinInfo } from "@sentio/sdk/aptos/ext"
import { AptosResourcesProcessor } from "@sentio/sdk/aptos"

const commonOptions = { sparse:  true }
export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60]
  }
}

const tvlAll = Gauge.register("tvl_all", commonOptions)
const tvl = Gauge.register("tvl", commonOptions)
const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
const volume = Gauge.register("vol", volOptions)
const volumeByCoin = Gauge.register("vol_by_coin", volOptions)

// const accountTracker = AccountEventTracker.register("users")

amm.bind({startVersion: 2331560})
  .onEntryCreatePool(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1)
    ctx.eventLogger.emit("User", { distinctId: ctx.transaction.sender })
    // ctx.logger.info("PoolCreated", { user: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_add").add(1)
    ctx.eventLogger.emit("User",  { distinctId: ctx.transaction.sender })
    // ctx.logger.info("LiquidityAdded", { user: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_removed").add(1)
    ctx.eventLogger.emit("User",  { distinctId: ctx.transaction.sender })
    const coinXInfo = await getCoinInfo(evt.data_decoded.x_coin_type)
    const coinYInfo = await getCoinInfo(evt.data_decoded.y_coin_type)
    const xAmount = scaleDown(evt.data_decoded.x_removed_au, coinXInfo.decimals)
    const yAmount = scaleDown(evt.data_decoded.y_removed_au, coinYInfo.decimals)


    ctx.eventLogger.emit("LiquidityRemove",  {
      distinctId: ctx.transaction.sender,
      xAmount: xAmount,
      yAmount: yAmount,
      xType: coinXInfo.symbol,
      yType: coinYInfo.symbol,
      message: `${ctx.transaction.sender} removed liquidity for ${evt.data_decoded.x_removed_au} ${coinXInfo.symbol} and ${evt.data_decoded.y_removed_au} ${coinYInfo.symbol}`
    })
    // ctx.logger.info("LiquidityRemoved", { user: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const value = await auxExchange.recordTradingVolume(ctx, evt.data_decoded.in_coin_type, evt.data_decoded.out_coin_type, evt.data_decoded.in_au, evt.data_decoded.out_au)
    //
    const coinXInfo = await getCoinInfo(evt.data_decoded.in_coin_type)
    const coinYInfo = await getCoinInfo(evt.data_decoded.out_coin_type)
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })

    ctx.eventLogger.emit("User", { distinctId: ctx.transaction.sender })
  })

const auxExchange = new AptosDex<amm.Pool<any, any>>(volume, volumeByCoin, tvlAll, tvl, tvlByPool, {
  getXReserve: pool => pool.x_reserve.value,
  getYReserve: pool => pool.y_reserve.value,
  getExtraPoolTags: _ => {},
  poolTypeName: amm.Pool.TYPE_QNAME
})

AptosResourcesProcessor.bind({address: amm.DEFAULT_OPTIONS.address, startVersion: 2331560})
    .onVersionInterval((rs, ctx) => auxExchange.syncPools(rs, ctx))
