import {Gauge, MetricOptions} from "@sentio/sdk";

export const commonOptions = {sparse: true}
export const volOptions: MetricOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

export const totalValue = Gauge.register("total_value", commonOptions)
export const tvlAll = Gauge.register("tvl_all", commonOptions)
export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const tvlByPoolNew = Gauge.register("tvl_by_pool_new", commonOptions)
export const tvl = Gauge.register("tvl", commonOptions)
export const volume = Gauge.register("vol", volOptions)

export const singleVolume = Gauge.register("vol_single", volOptions)

export const inputUsd = [100, 1000, 10000, 100000]
export const priceImpact = Gauge.register("price_impact", commonOptions)

export const priceGauge = Gauge.register("price", commonOptions)
export const priceGaugeNew = Gauge.register("price_new", commonOptions)

export const auxTvlAll = Gauge.register("aux_tvl_all", commonOptions)
export const auxTvlByPool = Gauge.register("aux_tvl_by_pool", commonOptions)
export const auxTvl = Gauge.register("aux_tvl", commonOptions)
export const auxVolume = Gauge.register("aux_vol", volOptions)

export const auxSingleVolume = Gauge.register("aux_vol_single", volOptions)

export const pancakeTvlAll = Gauge.register("pancake_tvl_all", commonOptions)
export const pancakeTvlByPool = Gauge.register("pancake_tvl_by_pool", commonOptions)
export const pancakeTvl = Gauge.register("pancake_tvl", commonOptions)
export const pancakeVolume = Gauge.register("pancake_vol", volOptions)

export const pancakeSingleVolume = Gauge.register("pancake_vol_single", volOptions)

export const recordAccount = false

