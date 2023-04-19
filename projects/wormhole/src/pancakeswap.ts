import { swap } from "./types/aptos/pancake-swap.js";
import { AptosDex, getCoinInfo } from "@sentio/sdk/aptos/ext";
import { pancakeTvl, pancakeTvlAll, pancakeTvlByPool, pancakeVolume, pancakeVolumeByCoin } from "./metrics.js";
import { isWormhole } from "./utils.js";
import { AptosResourcesProcessor } from "@sentio/sdk/aptos";

swap.bind()
    .onEventPairCreatedEvent(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.data_decoded.token_x)
      const coinYInfo = await getCoinInfo(evt.data_decoded.token_y)
      ctx.meter.Counter("num_pools").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("num_pools").add(1, { bridge: coinYInfo.bridge })
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.type_arguments[0])
      const coinYInfo = await getCoinInfo(evt.type_arguments[1])
      ctx.meter.Counter("event_liquidity_add").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_liquidity_add").add(1, { bridge: coinYInfo.bridge })
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.type_arguments[0])
      const coinYInfo = await getCoinInfo(evt.type_arguments[1])
      ctx.meter.Counter("event_liquidity_removed").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_liquidity_removed").add(1, { bridge: coinYInfo.bridge })
    })
    .onEventSwapEvent(async (evt, ctx) => {
      if (!isWormhole(evt.type_arguments[0], evt.type_arguments[1])) {
        return
      }
      const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
          evt.type_arguments[0], evt.type_arguments[1],
          evt.data_decoded.amount_x_in + evt.data_decoded.amount_x_out,
          evt.data_decoded.amount_y_in + evt.data_decoded.amount_y_out)

      const coinXInfo = await getCoinInfo(evt.type_arguments[0])
      const coinYInfo = await getCoinInfo(evt.type_arguments[1])
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    })

const PANCAKE_SWAP_APTOS = new AptosDex<swap.TokenPairReserve<any, any>>(
    pancakeVolume,
    pancakeVolumeByCoin,
    pancakeTvlAll, pancakeTvl, pancakeTvlByPool,{
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getExtraPoolTags: _ => {},
  poolType: swap.TokenPairReserve.type()
})

AptosResourcesProcessor.bind({address: swap.DEFAULT_OPTIONS.address })
    .onVersionInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx))
