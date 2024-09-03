// @ts-nocheck

import { aggregator, coin, optional_aggregator } from "@sentio/sdk/aptos/builtin/0x1";
import { Gauge, scaleDown } from "@sentio/sdk";
import {
  getCoinInfo, getPair,
  getPrice, PoolAdaptor,
  SimpleCoinInfo, whitelistCoins
} from "@sentio/sdk/aptos/ext";
import { delay } from "@sentio/sdk/aptos/ext";
import { amm } from "./types/aptos/auxexchange.js";
import { liquidity_pool } from "./types/aptos/liquidswap.js";
import { swap } from "./types/aptos/pancake-swap.js";
import { BigDecimal } from "@sentio/sdk";
import {
  AptosResourcesContext,
  TypedMoveResource,
  MoveResource,
  defaultMoveCoder,
  AptosResourcesProcessor,
  AptosContext,
  getAptosClient
} from "@sentio/sdk/aptos";

const commonOptions = { sparse:  true }
const totalValue = Gauge.register("total_value", commonOptions)
// const accountTracker = AccountEventTracker.register("users")
// const lpTracker = AccountEventTracker.register("lp")

export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const volume = Gauge.register("vol", commonOptions)

// function isUSDC(info: SimpleCoinInfo): boolean {
//   return info.symbol.toLowerCase().includes("usdc");
// }

function isUSDCType(type: string): boolean {
  const r = whitelistCoins().get(type)
  if (!r) {
    return false
  }
  return r.symbol.toLowerCase().includes("usdc");
}

function isUSDCPair(typeX: string, typeY: string) {
  return isUSDCType(typeX) || isUSDCType(typeY)
}

const client = getAptosClient()!

// coin.loadTypes(defaultMoveCoder())
for (const token of whitelistCoins().values()) {
  if (!isUSDCType(token.token_type.type)) {
    continue
  }

  const coinInfoType = `0x1::coin::CoinInfo<${token.token_type.type}>`
  // const price = await getPrice(v.token_type.type, timestamp)
  // @ts-ignore
  AptosResourcesProcessor.bind({address: token.token_type.account_address})
    .onVersionInterval(async (resources, ctx) => {
      const coinInfoRes = await defaultMoveCoder().filterAndDecodeResources(coin.CoinInfo.type(), resources)
      if (coinInfoRes.length === 0) {
        return
      }
      const coinInfo = coinInfoRes[0].data_decoded

      const aggOption = (coinInfo.supply.vec as optional_aggregator.OptionalAggregator[])[0]
      let amount
      if (aggOption.integer.vec.length) {
        const intValue = (aggOption.integer.vec[0] as optional_aggregator.Integer)
        amount = intValue.value
      } else {
        console.error("Need use get table")
        const agg = (aggOption.aggregator.vec[0] as aggregator.Aggregator)
        let aggString: any
        while (!aggString) {
          try {
            aggString = await client.getTableItem(agg.handle, {
              key: agg.key,
              key_type: "address",
              value_type: "u128"
            }, {ledgerVersion: ctx.version})
          } catch (e) {
            if (e.status === 429) {
              await delay(1000 + Math.floor(Math.random() * 1000))
            } else {
              throw e
            }
          }
        }
        amount = BigInt(aggString)
      }

      const price = await getPrice(token.token_type.type, ctx.timestampInMicros)
      const value = scaleDown(amount, coinInfo.decimals).multipliedBy(price)
      if (value.isGreaterThan(0)) {
        totalValue.record(ctx, value, {coin: token.symbol, bridge: token.bridge, type: token.token_type.type})
      }
    }, 100000, 1000000, coinInfoType)
}

liquidity_pool.bind()
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    ctx.meter.Counter("num_pools").add(1)
    ctx.eventLogger.emit("lp", {distinctId: ctx.transaction.sender})
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    ctx.meter.Counter("event_liquidity_add").add(1)
    ctx.eventLogger.emit("lp",  {distinctId: ctx.transaction.sender})
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    ctx.meter.Counter("event_liquidity_removed").add(1)
    ctx.eventLogger.emit("lp",  {distinctId: ctx.transaction.sender})
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    const coinXInfo = getCoinInfo(evt.type_arguments[0])
    const coinYInfo = getCoinInfo(evt.type_arguments[1])

    ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
    ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})

    ctx.eventLogger.emit("user",  {distinctId: ctx.transaction.sender})
    await LIQUID_SWAP.recordTradingVolume(ctx,
        evt.type_arguments[0], evt.type_arguments[1],
        evt.data_decoded.x_in + evt.data_decoded.x_out,
        evt.data_decoded.y_in + evt.data_decoded.y_out,
        { curve: getCurve(evt.type_arguments[2]), protocol: "liquidswap" })
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    const coinXInfo = getCoinInfo(evt.type_arguments[0])
    const coinYInfo = getCoinInfo(evt.type_arguments[1])
    ctx.meter.Counter("event_flashloan_by_bridge").add(1, {bridge: coinXInfo.bridge})
    ctx.meter.Counter("event_flashloan_by_bridge").add(1, {bridge: coinYInfo.bridge})

    ctx.eventLogger.emit("user", {distinctId: ctx.transaction.sender})
  })

amm.bind()
  .onEntryCreatePool(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("num_pools").add(1)
    ctx.eventLogger.emit("lp",  { distinctId: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)) {
      return
    }
    ctx.meter.Counter("event_liquidity_add").add(1)
    ctx.eventLogger.emit("lp",   { distinctId: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)) {
      return
    }
    ctx.meter.Counter("event_liquidity_removed").add(1)
    ctx.eventLogger.emit("lp",   { distinctId: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_decoded.in_coin_type, evt.data_decoded.out_coin_type)) {
      return
    }
    const coinXInfo = await getCoinInfo(evt.data_decoded.in_coin_type)
    const coinYInfo = await getCoinInfo(evt.data_decoded.out_coin_type)
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    ctx.eventLogger.emit("user", { distinctId: ctx.transaction.sender })

    await AUX_EXCHANGE.recordTradingVolume(ctx, evt.data_decoded.in_coin_type, evt.data_decoded.out_coin_type, evt.data_decoded.in_au, evt.data_decoded.out_au, { protocol: "aux" })
  })

swap.bind()
  .onEventPairCreatedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_decoded.token_x, evt.data_decoded.token_y)) {
      return
    }
    ctx.meter.Counter("num_pools").add(1)
    ctx.eventLogger.emit("lp",   { distinctId: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("event_liquidity_add").add(1)
    ctx.eventLogger.emit("lp",   { distinctId: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("event_liquidity_removed").add(1)
    ctx.eventLogger.emit("lp",   { distinctId: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    const coinXInfo = await getCoinInfo(evt.type_arguments[0])
    const coinYInfo = await getCoinInfo(evt.type_arguments[1])
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    ctx.eventLogger.emit("user",  { distinctId: ctx.transaction.sender })

    await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
        evt.type_arguments[0], evt.type_arguments[1],
        evt.data_decoded.amount_x_in + evt.data_decoded.amount_x_out,
        evt.data_decoded.amount_y_in + evt.data_decoded.amount_y_out, { protocol: "pancake" })
  })

export class USDCDex<T> {
  poolAdaptor: PoolAdaptor<T>

  constructor(poolAdaptor: PoolAdaptor<T>) {
    this.poolAdaptor = poolAdaptor
  }

  async recordTradingVolume(ctx: AptosContext, coinx: string, coiny: string, coinXAmount: bigint, coinYAmount: bigint, extraLabels?: any): Promise<void> {
    if (!isUSDCPair(coinx, coiny)) {
      return
    }

    const coinXInfo = await getCoinInfo(coinx)
    const coinYInfo = await getCoinInfo(coiny)

    const pair = await getPair(coinx, coiny)

    let baseLabels: Record<string, string> = extraLabels ? { ...extraLabels, pair } : { pair }

    if (isUSDCType(coinx)) {
      const value = scaleDown(coinXAmount, coinXInfo.decimals)
      volume.record(ctx, value, { ...baseLabels, coin: coinXInfo.symbol, bridge: coinXInfo.bridge, type: coinXInfo.token_type.type})
    } else if (isUSDCType(coiny)) {
      const value = scaleDown(coinYAmount, coinYInfo.decimals)
      volume.record(ctx, value, { ...baseLabels, coin: coinYInfo.symbol, bridge: coinYInfo.bridge, type: coinYInfo.token_type.type})
    }
  }

  async syncPools(
      resources: MoveResource[],
      ctx: AptosResourcesContext
  ) {
    let pools = await defaultMoveCoder().filterAndDecodeResources(this.poolAdaptor.poolType, resources)

    console.log("num of pools: ", pools.length, ctx.version.toString())

    for (const pool of pools) {
      const coinx = pool.type_arguments[0]
      const coiny = pool.type_arguments[1]
      if (!isUSDCPair(coinx, coiny)) {
        continue
      }

      const pair = await getPair(coinx, coiny)
      const extraLabels = this.poolAdaptor.getExtraPoolTags(pool)
      const baseLabels: Record<string, string> = { ...extraLabels,  pair }

      const coinXInfo = await getCoinInfo(coinx)
      const coinYInfo = await getCoinInfo(coiny)

      const coinx_amount = this.poolAdaptor.getXReserve(pool.data_decoded)
      const coiny_amount = this.poolAdaptor.getYReserve(pool.data_decoded)

      let poolValue = BigDecimal(0)

      if (isUSDCType(coinx)) {
        poolValue = await scaleDown(coinx_amount, coinXInfo.decimals).multipliedBy(2)
      } else {
        poolValue = await scaleDown(coiny_amount, coinYInfo.decimals).multipliedBy(2)
      }

      // const meaningful = String(poolValue.isGreaterThan(100))
      if (poolValue.isGreaterThan(0)) {
        tvlByPool.record(ctx, poolValue, {...baseLabels})
      }
    }
  }
}

const AUX_EXCHANGE = new USDCDex<amm.Pool<any, any>>({
  getXReserve: pool => pool.x_reserve.value,
  getYReserve: pool => pool.y_reserve.value,
  getExtraPoolTags: _ => { return { protocol: "aux" }},
  poolType: amm.Pool.type()
})

AptosResourcesProcessor.bind({address: amm.DEFAULT_OPTIONS.address})
    .onTimeInterval((rs,ctx) => AUX_EXCHANGE.syncPools(rs, ctx),
        60 * 24, 60 * 24)

const PANCAKE_SWAP_APTOS = new USDCDex<swap.TokenPairReserve<any, any>>({
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getExtraPoolTags: _ => { return { protocol: "pancake" }},
  poolType: swap.TokenPairReserve.type()
})

function getCurve(type: string) {
  if (type.includes("0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Stable")) {
    return "Stable"
  } else {
    return "Uncorrelated"
  }
}

AptosResourcesProcessor.bind({address: swap.DEFAULT_OPTIONS.address })
    .onTimeInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx),
        60 * 24, 60 * 24)

const LIQUID_SWAP = new USDCDex<liquidity_pool.LiquidityPool<any, any, any>>({
  getXReserve: pool => pool.coin_x_reserve.value,
  getYReserve: pool => pool.coin_y_reserve.value,
  getExtraPoolTags: pool => { return { protocol: "liquidswap", curve: getCurve(pool.type_arguments[2]) } },
  poolType: liquidity_pool.LiquidityPool.type()
})

AptosResourcesProcessor.bind({address: "0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948"})
    .onTimeInterval(async (resources, ctx) => LIQUID_SWAP.syncPools(resources, ctx),
        60 * 24, 60 * 24)
