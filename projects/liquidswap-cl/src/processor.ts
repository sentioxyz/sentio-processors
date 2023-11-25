import { pool } from './types/aptos/testnet/0x441500aa9825825f2f88b325d25c39be76682a5518ffee48848c7d208727ecea.js'
import { AptosDex } from "@sentio/sdk/aptos/ext";
import { Gauge, MetricOptions } from "@sentio/sdk";
import { type_info } from "@sentio/sdk/aptos/builtin/0x1";

// pool.bind().onEventSwapEvent()

export const commonOptions = {sparse: true}
export const volOptions: MetricOptions = {
  sparse: true,
  // aggregationConfig: {
  //   intervalInMinutes: [60],
  // }
}


export const totalValue = Gauge.register("total_value", commonOptions)
export const tvlAll = Gauge.register("tvl_all", commonOptions)
export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const tvlByPoolNew = Gauge.register("tvl_by_pool_new", commonOptions)
export const tvl = Gauge.register("tvl", commonOptions)
export const volume = Gauge.register("vol", volOptions)
export const volumeByCoin = Gauge.register("vol_by_coin", volOptions)

const liquidSwap = new AptosDex(volume, volumeByCoin,
    tvlAll, tvl, tvlByPool, {
      getXReserve: pool => pool.coins_x.value,
      getYReserve: pool => pool.coins_y.value,
      getExtraPoolTags: pool => {
        return {curve: pool.type_arguments[2]}
      },
      poolType: pool.Pool.type()
    })

pool.bind()
    .onEventPoolCreatedEvent(async (evt, ctx) => {
      const coinx = toTypeString(evt.data_decoded.x)
      const coiny = toTypeString(evt.data_decoded.y)

      ctx.meter.Counter("num_pools").add(1)

      // const value = await liquidSwap.recordTradingVolume(ctx,
      //     coinx, coiny,
      //     evt.data_decoded.bin_step + evt.data_decoded.x_out,
      //     evt.data_decoded.y_in + evt.data_decoded.y_out,
      //     {curve: getCurve(evt.type_arguments[2]), ver})
    })
    .onEventSwapEvent(async (evt, ctx) => {
      const coinx = evt.type_arguments
      // const coiny = toTypeString(evt.data_decoded)
    })



function toTypeString(typ: type_info.TypeInfo) {
  return typ.account_address + "::" + typ.module_name + "::" + typ.struct_name
}