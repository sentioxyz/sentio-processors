import { AptosDex, getCoinInfo, whiteListed } from "@sentio-processor/common/dist/aptos";
import { amm } from "./types/aptos/auxexchange";
import { auxTvl, auxTvlAll, auxTvlByPool, auxVolume } from "./metrics";
import { isWormhole } from "./utils";
import { AptosAccountProcessor } from "@sentio/sdk-aptos";

const AUX_EXCHANGE = new AptosDex<amm.Pool<any, any>>(auxVolume, auxTvlAll, auxTvl, auxTvlByPool, {
  getXReserve: pool => pool.x_reserve.value,
  getYReserve: pool => pool.y_reserve.value,
  getExtraPoolTags: pool => { return { wormhole: isWormhole(pool.type_arguments[0], pool.type_arguments[1]) } },
  poolTypeName: amm.Pool.TYPE_QNAME
})

AptosAccountProcessor.bind({address: amm.DEFAULT_OPTIONS.address})
    .onVersionInterval((rs,ctx) => AUX_EXCHANGE.syncPools(rs, ctx) )

amm.bind()
    .onEntryCreatePool(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.type_arguments[0])
      const coinYInfo = await getCoinInfo(evt.type_arguments[1])
      ctx.meter.Counter("num_pools").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("num_pools").add(1, { bridge: coinYInfo.bridge })
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.data_typed.x_coin_type)
      const coinYInfo = await getCoinInfo(evt.data_typed.y_coin_type)

      ctx.meter.Counter("event_liquidity_add").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_liquidity_add").add(1, { bridge: coinYInfo.bridge })

      // ctx.logger.info("LiquidityAdded", { user: ctx.transaction.sender })
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
      const coinXInfo = await getCoinInfo(evt.data_typed.x_coin_type)
      const coinYInfo = await getCoinInfo(evt.data_typed.y_coin_type)

      ctx.meter.Counter("event_liquidity_removed").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_liquidity_removed").add(1, { bridge: coinYInfo.bridge })
    })
    .onEventSwapEvent(async (evt, ctx) => {
      const value = await AUX_EXCHANGE.recordTradingVolume(ctx, evt.data_typed.in_coin_type, evt.data_typed.out_coin_type, evt.data_typed.in_au, evt.data_typed.out_au)
      const coinXInfo = await getCoinInfo(evt.data_typed.in_coin_type)
      const coinYInfo = await getCoinInfo(evt.data_typed.out_coin_type)
      ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
      ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})
    })
