import { amm } from './types/aptos/auxexchange'
import { AccountEventTracker, Gauge } from "@sentio/sdk";

import { AptosDex, getCoinInfo } from "@sentio-processor/common/dist/aptos"
import { AptosAccountProcessor } from "@sentio/sdk-aptos"

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

const accountTracker = AccountEventTracker.register("users")

amm.bind({startVersion: 2331560})
  .onEntryCreatePool(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    // ctx.logger.info("PoolCreated", { user: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_add").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    // ctx.logger.info("LiquidityAdded", { user: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_removed").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    // ctx.logger.info("LiquidityRemoved", { user: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const value = await auxExchange.recordTradingVolume(ctx, evt.data_typed.in_coin_type, evt.data_typed.out_coin_type, evt.data_typed.in_au, evt.data_typed.out_au)
    //
    const coinXInfo = await getCoinInfo(evt.data_typed.in_coin_type)
    const coinYInfo = await getCoinInfo(evt.data_typed.out_coin_type)
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })

    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })

const auxExchange = new AptosDex<amm.Pool<any, any>>(volume, tvlAll, tvl, tvlByPool, {
  getXReserve: pool => pool.x_reserve.value,
  getYReserve: pool => pool.y_reserve.value,
  getExtraPoolTags: _ => {},
  poolTypeName: amm.Pool.TYPE_QNAME
})

AptosAccountProcessor.bind({address: amm.DEFAULT_OPTIONS.address, startVersion: 2331560})
    .onVersionInterval((rs, ctx) => auxExchange.syncPools(rs, ctx))
