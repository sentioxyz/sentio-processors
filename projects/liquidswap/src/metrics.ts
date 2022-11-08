import { AccountEventTracker, Gauge } from "@sentio/sdk";

export const commonOptions = { sparse:  true }
export const totalValue = new Gauge("total_value", commonOptions)
export const tvlAll = new Gauge("tvl_all", commonOptions)
export const tvlByPool = new Gauge("tvl_by_pool", commonOptions)
export const tvl = new Gauge("tvl", commonOptions)
export const volume = new Gauge("vol", commonOptions)

export const inputUsd = [100, 1000, 10000, 100000]
export const priceImpact = new Gauge('price_impact', commonOptions)

export const accountTracker = AccountEventTracker.register("users")
export const lpTracker = AccountEventTracker.register("lp")

export const auxTvlAll = new Gauge("aux_tvl_all", commonOptions)
export const auxVolume = new Gauge("aux_vol", commonOptions)
export const auxTvlByPool = new Gauge("aux_tvl_by_pool", commonOptions)
export const auxTvl = new Gauge("aux_tvl", commonOptions)

export const pancakeTvlAll = new Gauge("pancake_tvl_all", commonOptions)
export const pancakeVolume = new Gauge("pancake_vol", commonOptions)
export const pancakeTvlByPool = new Gauge("pancake_tvl_by_pool", commonOptions)
export const pancakeTvl = new Gauge("pancake_tvl", commonOptions)