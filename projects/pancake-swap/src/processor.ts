import { swap } from './types/aptos/pancake-swap.js'
import { Gauge } from "@sentio/sdk";

import { AptosDex, getCoinInfo } from "@sentio-processor/common/aptos"
import {  AptosAccountProcessor } from "@sentio/sdk/aptos";
import { IFO } from "./types/aptos/movecoin.js";

const commonOptions = { sparse:  true }
export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

const tvlAll = Gauge.register("tvl_all", commonOptions)
const tvl = Gauge.register("tvl", commonOptions)
const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
const volume = Gauge.register("vol", volOptions)

// const accountTracker = AccountEventTracker.register("users")

IFO.bind()
    .onEventDepositEvent(async (evt, ctx)=>{
      ctx.eventLogger.emit("user", {
        distinctId: evt.data_decoded.user, eventLabel: "Deposit",
        amount: evt.data_decoded.amount,
        pid: evt.data_decoded.pid,
      })
    })
    .onEventHarvestEvent(async (evt, ctx) => {
      ctx.eventLogger.emit("user", {
        distinctId: evt.data_decoded.user,
        eventLabel: "Harvest",
        amount: evt.data_decoded.offering_amount,
        pid: evt.data_decoded.pid
      })
    })

swap.bind({startVersion: 10463608})
  .onEventPairCreatedEvent(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1)
    ctx.eventLogger.emit("user", { distinctId: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_add").add(1)
    ctx.eventLogger.emit("user", { distinctId: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_removed").add(1)
    ctx.eventLogger.emit("user", { distinctId: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
              evt.type_arguments[0], evt.type_arguments[1],
  evt.data_decoded.amount_x_in + evt.data_decoded.amount_x_out,
  evt.data_decoded.amount_y_in + evt.data_decoded.amount_y_out)

    // console.log(JSON.stringify(ctx.transaction))
    // console.log(JSON.stringify(evt))

    const coinXInfo = await getCoinInfo(evt.type_arguments[0])
    const coinYInfo = await getCoinInfo(evt.type_arguments[1])
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })

    ctx.eventLogger.emit("user", { distinctId: ctx.transaction.sender })
  })

const PANCAKE_SWAP_APTOS = new AptosDex<swap.TokenPairReserve<any, any>>(volume, tvlAll, tvl, tvlByPool,{
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getExtraPoolTags: _ => {},
  poolTypeName: swap.TokenPairReserve.TYPE_QNAME
  },
)

AptosAccountProcessor.bind({address: swap.DEFAULT_OPTIONS.address, startVersion: 10463608})
    .onVersionInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx))
