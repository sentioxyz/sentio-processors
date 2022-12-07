import { AptosDex, getCoinInfo, getPairValue } from "@sentio-processor/common/dist/aptos";
import { amm } from "./types/aptos/auxexchange";
import { aptos } from "@sentio/sdk";
import {
  auxTvl,
  auxTvlAll,
  auxTvlByPool,
  auxVolume,
  liquidity_by_account,
  recordAccount,
  vol_by_account
} from "./metrics";

const AUX_EXCHANGE = new AptosDex<amm.Pool<any, any>>(auxVolume, auxTvlAll, auxTvl, auxTvlByPool, {
  getXReserve: pool => pool.x_reserve.value,
  getYReserve: pool => pool.y_reserve.value,
  getExtraPoolTags: _ => {},
  poolTypeName: amm.Pool.TYPE_QNAME
})

aptos.AptosAccountProcessor.bind({address: amm.DEFAULT_OPTIONS.address})
    .onTimeInterval((rs,ctx) =>
        AUX_EXCHANGE.syncPools(rs, ctx), 60, 12 * 60)

amm.bind()
    .onEntryCreatePool(async (evt, ctx) => {
      ctx.meter.Counter("num_pools").add(1)
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
      if (recordAccount) {
        const value = await getPairValue(ctx, evt.data_typed.x_coin_type, evt.data_typed.y_coin_type, evt.data_typed.x_added_au, evt.data_typed.y_added_au)
        if (value.isGreaterThan(10)) {
          liquidity_by_account.add(ctx, value, { account: ctx.transaction.sender})
        }
      }
      ctx.meter.Counter("event_liquidity_add").add(1)
      // ctx.logger.info("LiquidityAdded", { user: ctx.transaction.sender })
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
      ctx.meter.Counter("event_liquidity_removed").add(1)
    })
    .onEventSwapEvent(async (evt, ctx) => {
      const value = await AUX_EXCHANGE.recordTradingVolume(ctx, evt.data_typed.in_coin_type, evt.data_typed.out_coin_type, evt.data_typed.in_au, evt.data_typed.out_au)
      if (recordAccount && value.isGreaterThan(100)) {
        vol_by_account.add(ctx, value, { account: ctx.transaction.sender})
      }
      const coinXInfo = await getCoinInfo(evt.data_typed.in_coin_type)
      const coinYInfo = await getCoinInfo(evt.data_typed.out_coin_type)
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
      ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    })
