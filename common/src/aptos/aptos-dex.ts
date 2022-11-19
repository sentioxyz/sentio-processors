import { aptos, Counter, Gauge } from "@sentio/sdk";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { calculateValueInUsd, CORE_TOKENS, getCoinInfo, whiteListed } from "./coin"
import { AptosResourceContext } from "@sentio/sdk/lib/aptos/context";
import { MoveResource } from "aptos-sdk/src/generated";
import { TypedMoveResource } from "@sentio/sdk/lib/aptos";

export interface PoolAdaptor<T> {
  getXReserve(pool: T): bigint
  getYReserve(pool: T): bigint
  getExtraPoolTags(pool: TypedMoveResource<T>): any
  poolTypeName: string
}

export class AptosDex<T> {
  poolAdaptor: PoolAdaptor<T>
  volume: Gauge
  tvlAll: Gauge
  tvlByPool: Gauge
  tvlByCoin: Gauge

  constructor(volume: Gauge, tvlAll: Gauge, tvlByCoin: Gauge, tvlByPool: Gauge, poolAdaptor: PoolAdaptor<T>) {
    this.volume = volume
    this.tvlAll = tvlAll
    this.tvlByPool = tvlByPool
    this.tvlByCoin = tvlByCoin
    this.poolAdaptor = poolAdaptor
  }

  async recordTradingVolume(ctx: aptos.AptosContext, coinx: string, coiny: string, coinXAmount: bigint, coinYAmount: bigint, extraLabels?: any): Promise<BigDecimal> {
    const whitelistx = whiteListed(coinx)
    const whitelisty = whiteListed(coiny)
    const coinXInfo = await getCoinInfo(coinx)
    const coinYInfo = await getCoinInfo(coiny)
    const timestamp = ctx.transaction.timestamp
    let result = BigDecimal(0.0)

    if (!whitelistx || !whitelisty) {
      return result
    }

    const pair = await getPair(coinx, coiny)

    let baseLabels: Record<string, string> = extraLabels ? { ...extraLabels, pair } : { pair }

    if (whitelistx) {
      const value = await calculateValueInUsd(coinXAmount, coinXInfo, timestamp)
      result = value

      this.volume.record(ctx, value, { ...baseLabels, coin: coinXInfo.symbol, bridge: coinXInfo.bridge, type: coinXInfo.token_type.type})
    }
    if (whitelisty) {
      const value = await calculateValueInUsd(coinYAmount, coinYInfo, timestamp)
      result = value

      this.volume.record(ctx, value, { ...baseLabels, coin: coinYInfo.symbol, bridge: coinYInfo.bridge, type: coinYInfo.token_type.type})
    }

    return result
  }

  async syncPools(
      resources: MoveResource[],
      ctx: AptosResourceContext,
      poolsHandler?: (pools: TypedMoveResource<T>[]) => Promise<void> | void
    ) {
    let pools: TypedMoveResource<T>[] =
        aptos.TYPE_REGISTRY.filterAndDecodeResources(this.poolAdaptor.poolTypeName, resources)

    const volumeByCoin = new Map<string, BigDecimal>()
    const timestamp = ctx.timestampInMicros

    console.log("num of pools: ", pools.length, ctx.version.toString())

    let tvlAllValue = BigDecimal(0)
    for (const pool of pools) {
      // savePool(ctx.version, pool.type_arguments)
      const coinx = pool.type_arguments[0]
      const coiny = pool.type_arguments[1]
      const whitelistx = whiteListed(coinx)
      const whitelisty = whiteListed(coiny)
      if (!whitelistx && !whitelisty) {
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

      if (whitelistx) {
        const value = await calculateValueInUsd(coinx_amount, coinXInfo, timestamp)
        poolValue = poolValue.plus(value)
        // tvlTotal.record(ctx, value, { pool: poolName, type: coinXInfo.token_type.type })

        let coinXTotal = volumeByCoin.get(coinXInfo.token_type.type)
        if (!coinXTotal) {
          coinXTotal = value
        } else {
          coinXTotal = coinXTotal.plus(value)
        }
        volumeByCoin.set(coinXInfo.token_type.type, coinXTotal)

        if (!whitelisty) {
          poolValue = poolValue.plus(value)
          // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type})
        }
      }
      if (whitelisty) {
        const value = await calculateValueInUsd(coiny_amount, coinYInfo, timestamp)
        poolValue = poolValue.plus(value)
        // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type })

        let coinYTotal = volumeByCoin.get(coinYInfo.token_type.type)
        if (!coinYTotal) {
          coinYTotal = value
        } else {
          coinYTotal = coinYTotal.plus(value)
        }
        volumeByCoin.set(coinYInfo.token_type.type, coinYTotal)

        if (!whitelistx) {
          tvlAllValue = tvlAllValue.plus(value)
          // tvlTotal.record(ctx, value, { pool: poolName, type: coinXInfo.token_type.type })
        }
      }

      if (poolValue.isGreaterThan(0)) {
        this.tvlByPool.record(ctx, poolValue, baseLabels)
      }
      tvlAllValue = tvlAllValue.plus(poolValue)
    }
    this.tvlAll.record(ctx, tvlAllValue)

    if (poolsHandler) {
      poolsHandler(pools)
    }

    for (const [k, v] of volumeByCoin) {
      const coinInfo = CORE_TOKENS.get(k)
      if (!coinInfo) {
        throw Error("unexpected coin " + k)
      }
      // const price = await getPrice(coinInfo, timestamp)
      // priceGauge.record(ctx, price, { coin: coinInfo.symbol })
      if (v.isGreaterThan(0)) {
        this.tvlByCoin.record(ctx, v, {coin: coinInfo.symbol, bridge: coinInfo.bridge, type: coinInfo.token_type.type})
      }
    }
  }
}

export async function getPair(coinx: string, coiny: string): Promise<string> {
  const coinXInfo = await getCoinInfo(coinx)
  const coinYInfo = await getCoinInfo(coiny)
  if (coinXInfo.symbol.localeCompare(coinYInfo.symbol) > 0) {
    return `${coinYInfo.symbol}-${coinXInfo.symbol}`
  }
  return `${coinXInfo.symbol}-${coinYInfo.symbol}`
}



