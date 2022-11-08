import { swap } from "./types/aptos/pancake-swap";
import { AptosDex, getCoinInfo } from "@sentio-processor/common/dist/aptos";
import { aptos } from "@sentio/sdk";
import { pancakeTvl, pancakeTvlAll, pancakeTvlByPool, pancakeVolume } from "./metrics";

swap.bind({startVersion: 10463608})
    .onEventPairCreatedEvent(async (evt, ctx) => {
      ctx.meter.Counter("num_pools").add(1)
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
      ctx.meter.Counter("event_liquidity_add").add(1)
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
      ctx.meter.Counter("event_liquidity_removed").add(1)
    })
    .onEventSwapEvent(async (evt, ctx) => {
      const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
          evt.type_arguments[0], evt.type_arguments[1],
          evt.data_typed.amount_x_in + evt.data_typed.amount_x_out,
          evt.data_typed.amount_y_in + evt.data_typed.amount_y_out)

      const coinXInfo = await getCoinInfo(evt.type_arguments[0])
      const coinYInfo = await getCoinInfo(evt.type_arguments[1])
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    })

const PANCAKE_SWAP_APTOS = new AptosDex<swap.TokenPairReserve<any, any>>(pancakeVolume, pancakeTvlAll, pancakeTvl, pancakeTvlByPool,{
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getCurve: _ => undefined,

  poolTypeName: swap.TokenPairReserve.TYPE_QNAME
})

aptos.AptosAccountProcessor.bind({address: swap.DEFAULT_OPTIONS.address, startVersion: 10463608})
    .onVersionInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx))
