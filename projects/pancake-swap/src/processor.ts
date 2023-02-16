import { swap } from './types/aptos/pancake-swap.js'
import { Gauge } from "@sentio/sdk";

import { AptosDex, getCoinInfo } from "@sentio-processor/common/aptos"
import {  AptosAccountProcessor } from "@sentio/sdk/aptos";
import { IFO } from "./types/aptos/movecoin.js";
import { getPair, getPairValue } from "@sentio-processor/common/aptos";
import { coin } from "@sentio/sdk/aptos/builtin/0x1";

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
const singleVolume = Gauge.register("vol_single", volOptions)

// const accountTracker = AccountEventTracker.register("users")

IFO.bind()
    .onEventDepositEvent(async (evt, ctx)=>{
      console.log(JSON.stringify(evt))
      ctx.eventLogger.emit("Deposit", {
        distinctId: evt.data_decoded.user,
        amount: evt.data_decoded.amount,
        pid: evt.data_decoded.pid,
      })
    })
    .onEventHarvestEvent(async (evt, ctx) => {
      ctx.eventLogger.emit("Harvest", {
        distinctId: evt.data_decoded.user,
        amount: evt.data_decoded.offering_amount,
        pid: evt.data_decoded.pid
      })
    })

swap.bind({startVersion: 10463608})
  .onEventPairCreatedEvent(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1)
    const coinx = evt.data_decoded.token_x
    const coiny = evt.data_decoded.token_y
    const pair = await getPair(coinx, coiny)
    ctx.eventLogger.emit("Create Pair", {
      distinctId: ctx.transaction.sender,
      pair,
      message: `Created ${pair}`
    })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_add").add(1)
    const coinx = evt.type_arguments[0]
    const coiny = evt.type_arguments[1]
    const value = await getPairValue(ctx, coinx, coiny, evt.data_decoded.amount_x, evt.data_decoded.amount_y)
    ctx.eventLogger.emit("Add Liquidity", {
      distinctId: ctx.transaction.sender,
      pair: await getPair(coinx, coiny),
      value,
    })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_removed").add(1)
    const coinx = evt.type_arguments[0]
    const coiny = evt.type_arguments[1]
    const value = await getPairValue(ctx, coinx, coiny, evt.data_decoded.amount_x, evt.data_decoded.amount_y)
    ctx.eventLogger.emit("Remove Liquidity", {
      distinctId: ctx.transaction.sender,
      pair: await getPair(coinx, coiny),
      value
    })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const coinx = evt.type_arguments[0]
    const coiny = evt.type_arguments[1]

    const amountx = evt.data_decoded.amount_x_in + evt.data_decoded.amount_x_out
    const amounty = evt.data_decoded.amount_y_in + evt.data_decoded.amount_y_out
    const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx, coinx, coiny, amountx, amounty)

    // console.log(JSON.stringify(ctx.transaction))
    // console.log(JSON.stringify(evt))
    const coinXInfo = await getCoinInfo(coinx)
    const coinYInfo = await getCoinInfo(coiny)
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })

    let message: string
    const summaryX = `${amountx.scaleDown(coinXInfo.decimals).toNumber()} ${coinXInfo.symbol}`
    const summaryY = `${amounty.scaleDown(coinYInfo.decimals).toNumber()} ${coinYInfo.symbol}`
    if (evt.data_decoded.amount_x_in) {
      message = `Swap ${summaryX} to ${summaryY}`
    } else {
      message = `Swap ${summaryY} to ${summaryX}`
    }

    ctx.eventLogger.emit("Swap", {
      distinctId: ctx.transaction.sender,
      pair: await getPair(coinx, coiny),
      value: value,
      message
    })
  })

const PANCAKE_SWAP_APTOS = new AptosDex<swap.TokenPairReserve<any, any>>(
    volume, singleVolume, tvlAll, tvl, tvlByPool,{
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getExtraPoolTags: _ => {},
  poolTypeName: swap.TokenPairReserve.TYPE_QNAME
  },
)

AptosAccountProcessor.bind({address: swap.DEFAULT_OPTIONS.address, startVersion: 10463608})
    .onVersionInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx))
