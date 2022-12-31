import { AptosClient } from "aptos-sdk";
import { aggregator, coin, optional_aggregator } from "@sentio/sdk-aptos/lib/builtin/0x1";
import { AccountEventTracker,  Gauge } from "@sentio/sdk";
import {
  CORE_TOKENS,
  getCoinInfo, getPair,
  getPrice, PoolAdaptor,
  scaleDown, SimpleCoinInfo
} from "@sentio-processor/common/dist/aptos";
import { delay, getRandomInt } from "@sentio-processor/common/dist";
import { amm } from "./types/aptos/auxexchange";
import { liquidity_pool } from "./types/aptos/liquidswap";
import { swap } from "./types/aptos/pancake-swap";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { MoveResource } from "aptos-sdk/src/generated";
import { AptosResourceContext, TypedMoveResource, TYPE_REGISTRY, AptosAccountProcessor, AptosContext } from "@sentio/sdk-aptos";

const commonOptions = { sparse:  true }
const totalValue = Gauge.register("total_value", commonOptions)
const accountTracker = AccountEventTracker.register("users")
const lpTracker = AccountEventTracker.register("lp")

export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const volume = Gauge.register("vol", commonOptions)

// function isUSDC(info: SimpleCoinInfo): boolean {
//   return info.symbol.toLowerCase().includes("usdc");
// }

function isUSDCType(type: string): boolean {
  const r = CORE_TOKENS.get(type)
  if (!r) {
    return false
  }
  return r.symbol.toLowerCase().includes("usdc");
}

function isUSDCPair(typeX: string, typeY: string) {
  return isUSDCType(typeX) || isUSDCType(typeY)
}

const client = new AptosClient("http://aptos-proxy-server.chain-sync:8646")

coin.loadTypes(TYPE_REGISTRY)
for (const token of CORE_TOKENS.values()) {
  if (!isUSDCType(token.token_type.type)) {
    continue
  }

  const coinInfoType = `0x1::coin::CoinInfo<${token.token_type.type}>`
  // const price = await getPrice(v.token_type.type, timestamp)
  AptosAccountProcessor.bind({address: token.token_type.account_address})
    .onVersionInterval(async (resources, ctx) => {
      const coinInfoRes = TYPE_REGISTRY.filterAndDecodeResources<coin.CoinInfo<any>>(coin.CoinInfo.TYPE_QNAME, resources)
      if (coinInfoRes.length === 0) {
        return
      }
      const coinInfo = coinInfoRes[0].data_typed

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
              await delay(1000 + getRandomInt(1000))
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
    lpTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    ctx.meter.Counter("event_liquidity_add").add(1)
    lpTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    ctx.meter.Counter("event_liquidity_removed").add(1)
    lpTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }

    const coinXInfo = getCoinInfo(evt.type_arguments[0])
    const coinYInfo = getCoinInfo(evt.type_arguments[1])

    ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
    ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})

    accountTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
    await LIQUID_SWAP.recordTradingVolume(ctx,
        evt.type_arguments[0], evt.type_arguments[1],
        evt.data_typed.x_in + evt.data_typed.x_out,
        evt.data_typed.y_in + evt.data_typed.y_out,
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

    accountTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
  })

amm.bind()
  .onEntryCreatePool(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("num_pools").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      return
    }
    ctx.meter.Counter("event_liquidity_add").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      return
    }
    ctx.meter.Counter("event_liquidity_removed").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_typed.in_coin_type, evt.data_typed.out_coin_type)) {
      return
    }
    const coinXInfo = await getCoinInfo(evt.data_typed.in_coin_type)
    const coinYInfo = await getCoinInfo(evt.data_typed.out_coin_type)
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })

    await AUX_EXCHANGE.recordTradingVolume(ctx, evt.data_typed.in_coin_type, evt.data_typed.out_coin_type, evt.data_typed.in_au, evt.data_typed.out_au, { protocol: "aux" })
  })

swap.bind()
  .onEventPairCreatedEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.data_typed.token_x, evt.data_typed.token_y)) {
      return
    }
    ctx.meter.Counter("num_pools").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("event_liquidity_add").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    ctx.meter.Counter("event_liquidity_removed").add(1)
    lpTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if(!isUSDCPair(evt.type_arguments[0], evt.type_arguments[1])) {
      return
    }
    const coinXInfo = await getCoinInfo(evt.type_arguments[0])
    const coinYInfo = await getCoinInfo(evt.type_arguments[1])
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })

    await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
        evt.type_arguments[0], evt.type_arguments[1],
        evt.data_typed.amount_x_in + evt.data_typed.amount_x_out,
        evt.data_typed.amount_y_in + evt.data_typed.amount_y_out, { protocol: "pancake" })
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
      ctx: AptosResourceContext
  ) {
    let pools: TypedMoveResource<T>[] =
        TYPE_REGISTRY.filterAndDecodeResources(this.poolAdaptor.poolTypeName, resources)

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

      const coinx_amount = this.poolAdaptor.getXReserve(pool.data_typed)
      const coiny_amount = this.poolAdaptor.getYReserve(pool.data_typed)

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
  poolTypeName: amm.Pool.TYPE_QNAME
})

AptosAccountProcessor.bind({address: amm.DEFAULT_OPTIONS.address})
    .onTimeInterval((rs,ctx) => AUX_EXCHANGE.syncPools(rs, ctx),
        60 * 24, 60 * 24)

const PANCAKE_SWAP_APTOS = new USDCDex<swap.TokenPairReserve<any, any>>({
  getXReserve: pool => pool.reserve_x,
  getYReserve: pool => pool.reserve_y,
  getExtraPoolTags: _ => { return { protocol: "pancake" }},
  poolTypeName: swap.TokenPairReserve.TYPE_QNAME
})

function getCurve(type: string) {
  if (type.includes("0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Stable")) {
    return "Stable"
  } else {
    return "Uncorrelated"
  }
}

AptosAccountProcessor.bind({address: swap.DEFAULT_OPTIONS.address })
    .onTimeInterval((rs, ctx) => PANCAKE_SWAP_APTOS.syncPools(rs, ctx),
        60 * 24, 60 * 24)

const LIQUID_SWAP = new USDCDex<liquidity_pool.LiquidityPool<any, any, any>>({
  getXReserve: pool => pool.coin_x_reserve.value,
  getYReserve: pool => pool.coin_y_reserve.value,
  getExtraPoolTags: pool => { return { protocol: "liquidswap", curve: getCurve(pool.type_arguments[2]) } },
  poolTypeName: liquidity_pool.LiquidityPool.TYPE_QNAME
})

AptosAccountProcessor.bind({address: "0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948"})
    .onTimeInterval(async (resources, ctx) => LIQUID_SWAP.syncPools(resources, ctx),
        60 * 24, 60 * 24)
