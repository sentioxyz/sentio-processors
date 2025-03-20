import {
  defaultMoveCoder,
  AptosResourcesProcessor,
  TypedMoveResource,
  AptosResourcesContext,
  AptosNetwork
} from '@sentio/sdk/aptos'
import { MoveResource } from '@aptos-labs/ts-sdk'

// v0
import * as v0 from './types/aptos/movement-mainnet/liquidswap.js'
const resourceAddress_v0 = '0xeef5ce9727e7faf3b83cb0630e91d45612eac563f670eecaadf1cb22c3bdfdfb'

// v0.5
import * as v05 from './types/aptos/movement-mainnet/liquidswap_0_5.js'
const resourceAddress_v05 = '0x3851f155e7fc5ec98ce9dbcaf04b2cb0521c562463bd128f9d1331b38c497cf3'

import { AptosDex, getPairValue, getPriceForToken, getTokenInfoWithFallback } from '@sentio/sdk/aptos/ext'
// } from "@sentio-processor/common/aptos"

import { AccountEventTracker, BigDecimal, scaleDown } from '@sentio/sdk'

import {
  inputUsd,
  priceGauge,
  priceGaugeNew,
  priceImpact,
  recordAccount,
  tvl,
  tvlAll,
  tvlByPool,
  tvlByPoolNew,
  volume,
  volumeByCoin
} from './metrics.js'
import { TokenInfo, whitelistTokens } from '@sentio/sdk/aptos/ext'

function addTokens() {
  const list = whitelistTokens()
  const tokens: TokenInfo[] = [
    {
      type: '0x4763c5cfde8517f48e930f7ece14806d75b98ce31b0b4eab99f49a067f5b5ef2::wrapped::WBTCe',
      name: 'WBTCe',
      symbol: 'WBTC.e',
      decimals: 8,
      bridge: 'Native',
      category: 'Bridged'
    },
    {
      type: '0x4763c5cfde8517f48e930f7ece14806d75b98ce31b0b4eab99f49a067f5b5ef2::wrapped::WETHe',
      name: 'WETHe',
      symbol: 'WETH.e',
      decimals: 18,
      bridge: 'Native',
      category: 'Bridged'
    }
  ]
  for (const token of tokens) {
    list.set(token.type, token)
  }
}

addTokens()

// TODO to remove
export const accountTracker = AccountEventTracker.register('users')
export const lps = AccountEventTracker.register('lps')

type PoolType<T0, T1, T2> = v05.liquidity_pool.LiquidityPool<T0, T1, T2>

const env = v05
const liquidity_pool = env.liquidity_pool
const curves = env.curves
const resourceAddress = resourceAddress_v05
const ver = 'v0.5'

const liquidSwap = new AptosDex<PoolType<any, any, any>>(volume, volumeByCoin, tvlAll, tvl, tvlByPool, {
  getXReserve: (pool) => pool.coin_x_reserve.value,
  getYReserve: (pool) => pool.coin_y_reserve.value,
  getExtraPoolTags: (pool) => {
    return { curve: pool.type_arguments[2], ver }
  },
  poolType: liquidity_pool.LiquidityPool.type()
})

liquidity_pool
  .bind({ network: AptosNetwork.MOVEMENT_MAIN_NET, baseLabels: { ver } })
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    ctx.meter.Counter('num_pools').add(1, { ver })
    ctx.eventLogger.emit('lp', { distinctId: ctx.transaction.sender, ver })
    // ctx.logger.info("", {user: "-", value: 0.0001})
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    ctx.meter.Counter('event_liquidity_add').add(1, { ver })
    ctx.eventLogger.emit('lp', { distinctId: ctx.transaction.sender, ver })

    if (recordAccount) {
      const value = await getPairValue(
        ctx,
        evt.type_arguments[0],
        evt.type_arguments[1],
        evt.data_decoded.added_x_val,
        evt.data_decoded.added_y_val
      )
      ctx.eventLogger.emit('liquidity', {
        distinctId: ctx.transaction.sender,
        account: ctx.transaction.sender,
        value: value.toNumber(),
        formula_value: value.toNumber() * 2,
        ver
      })
      ctx.eventLogger.emit('net_liquidity', {
        distinctId: ctx.transaction.sender,
        account: ctx.transaction.sender,
        value: value.toNumber(),
        formula_value: value.toNumber() * 2,
        ver
      })
    }
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    ctx.meter.Counter('event_liquidity_removed').add(1, { ver })
    ctx.eventLogger.emit('lp', { distinctId: ctx.transaction.sender, ver })
    if (recordAccount) {
      const value = await getPairValue(
        ctx,
        evt.type_arguments[0],
        evt.type_arguments[1],
        evt.data_decoded.returned_x_val,
        evt.data_decoded.returned_y_val
      )
      if (value.isGreaterThan(10)) {
        ctx.eventLogger.emit('net_liquidity', {
          distinctId: ctx.transaction.sender,
          account: ctx.transaction.sender,
          value: -value.toNumber(),
          formula_value: -value.toNumber() * 2,
          ver
        })
      } else {
        ctx.eventLogger.emit('net_liquidity', {
          distinctId: ctx.transaction.sender,
          account: 'Others',
          value: -value.toNumber(),
          formula_value: -value.toNumber() * 2,
          ver
        })
      }
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })

    const value = await liquidSwap.recordTradingVolume(
      ctx,
      evt.type_arguments[0],
      evt.type_arguments[1],
      evt.data_decoded.x_in + evt.data_decoded.x_out,
      evt.data_decoded.y_in + evt.data_decoded.y_out,
      { curve: getCurve(evt.type_arguments[2]), ver }
    )
    if (recordAccount) {
      ctx.eventLogger.emit('vol', {
        distinctId: ctx.transaction.sender,
        account: ctx.transaction.sender,
        value: value.toNumber(),
        ver
      })
    }

    // if (value.isGreaterThan(0)) {
    const pair = await getPair(evt.type_arguments[0], evt.type_arguments[1], ctx.network)
    ctx.eventLogger.emit('swap', {
      distinctId: ctx.transaction.sender,
      value: value,
      xAmount: evt.data_decoded.x_in + evt.data_decoded.x_out,
      yAmount: evt.data_decoded.y_in + evt.data_decoded.y_out,
      pair
    })
    // }
    const coinXInfo = await getTokenInfoWithFallback(evt.type_arguments[0], ctx.network)
    const coinYInfo = await getTokenInfoWithFallback(evt.type_arguments[1], ctx.network)
    // ctx.logger.info(`${ctx.transaction.sender} Swap ${coinXInfo.symbol} for ${coinYInfo.symbol}`, {user: ctx.transaction.sender, value: value.toNumber()})

    ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinXInfo.bridge, ver })
    ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinYInfo.bridge, ver })

    // ctx.eventLogger.emit("account", {
    //     distinctId: ctx.transaction.sender,
    //     "event": "swap",
    // })
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })

    const coinXInfo = await getTokenInfoWithFallback(evt.type_arguments[0], ctx.network)
    const coinYInfo = await getTokenInfoWithFallback(evt.type_arguments[1], ctx.network)
    ctx.meter.Counter('event_flashloan_by_bridge').add(1, { bridge: coinXInfo.bridge, ver })
    ctx.meter.Counter('event_flashloan_by_bridge').add(1, { bridge: coinYInfo.bridge, ver })

    ctx.eventLogger.emit('account', {
      distinctId: ctx.transaction.sender,
      event: 'flashloan',
      ver
    })
  })

// TODO pool name should consider not just use symbol name
async function getPair(coinx: string, coiny: string, network: AptosNetwork) {
  const coinXInfo = await getTokenInfoWithFallback(coinx, network)
  const coinYInfo = await getTokenInfoWithFallback(coiny, network)
  if (coinXInfo.symbol.localeCompare(coinYInfo.symbol) > 0) {
    return `${coinYInfo.symbol}-${coinXInfo.symbol}`
  }
  return `${coinXInfo.symbol}-${coinYInfo.symbol}`
}

function getCurve(type: string) {
  if (type.includes(curves.Stable.TYPE_QNAME)) {
    return 'Stable'
  } else {
    return 'Uncorrelated'
  }
}

// TODO refactor this
async function syncLiquidSwapPools(resources: MoveResource[], ctx: AptosResourcesContext) {
  let pools = await defaultMoveCoder(AptosNetwork.MOVEMENT_MAIN_NET).filterAndDecodeResources<PoolType<any, any, any>>(
    liquidity_pool.LiquidityPool.type(),
    resources
  )

  const volumeByCoin = new Map<string, BigDecimal>()
  const timestamp = ctx.timestampInMicros

  console.log('liquidswap num of pools: ', pools.length, ctx.version.toString())

  // function debugCoin(coin: string) {
  //     const coinInfo = await getTokenInfoWithFallback(coin)
  //     if (!["WETH", "zWETH", "APT", "tAPT"].includes(coinInfo.symbol)) {
  //         return
  //     }
  //     console.log("!!! debug", coinInfo.symbol, ", version:", ctx.version.toString())
  //     for (const pool of pools) {
  //         if (pool.type_arguments[0] == coin || pool.type_arguments[1] == coin) {
  //             const coinXInfo = await getTokenInfoWithFallback(pool.type_arguments[0])
  //             const coinYInfo = await getTokenInfoWithFallback(pool.type_arguments[1])
  //             console.log(`pool[${getPair(pool.type_arguments[0], pool.type_arguments[1])}] value: ${
  //                 pool.data_decoded.coin_x_reserve.value.scaleDown(coinXInfo.decimals)}, ${
  //                 pool.data_decoded.coin_y_reserve.value.scaleDown(coinYInfo.decimals)
  //             }`)
  //         }
  //     }
  // }

  const updated = new Set<string>()
  let tvlAllValue = BigDecimal(0)
  for (const pool of pools) {
    // savePool(ctx.version, pool.type_arguments)
    const coinx = pool.type_arguments[0]
    const coiny = pool.type_arguments[1]
    const whitelistx = liquidSwap.coinList.whiteListed(coinx)
    const whitelisty = liquidSwap.coinList.whiteListed(coiny)
    const coinXInfo = await getTokenInfoWithFallback(coinx, ctx.network)
    const coinYInfo = await getTokenInfoWithFallback(coiny, ctx.network)
    let priceX = BigDecimal(0)
    let priceY = BigDecimal(0)
    //             if (whitelistx) {
    //                 if (!updated.has(coinx)) {
    //                     updated.add(coinx)
    //                     priceX = calcPrice(coinx, pools) ?? BigDecimal(0)
    //                     if (priceX.eq(BigDecimal(0))) {
    // //                    debugCoin(coinx)
    //                         priceX = priceInUsd.get(coinx) ?? BigDecimal(0)
    //                     } else {
    //                         priceInUsd.set(coinx, priceX)
    //                     }
    //                 } else {
    //                     priceX = priceInUsd.get(coinx) ?? BigDecimal(0)
    //                 }
    //                 priceGaugeNew.record(ctx, priceX, {coin: coinXInfo.symbol, ver})
    //             }
    //             if (whitelisty) {
    //                 if (!updated.has(coiny)) {
    //                     updated.add(coiny)
    //                     priceY = calcPrice(coiny, pools) ?? BigDecimal(0)
    //                     if (priceY.eq(BigDecimal(0))) {
    //                         priceY = priceInUsd.get(coiny) ?? BigDecimal(0)
    //                     } else {
    //                         priceInUsd.set(coiny, priceY)
    //                     }
    //                 } else {
    //                     priceY = priceInUsd.get(coiny) ?? BigDecimal(0)
    //                 }
    //                 priceGaugeNew.record(ctx, priceY, {coin: coinYInfo.symbol, ver})
    //             }

    if (!whitelistx && !whitelisty) {
      continue
    }

    const pair = await getPair(coinx, coiny, ctx.network)
    const curve = getCurve(pool.type_arguments[2])

    const coinx_amount = pool.data_decoded.coin_x_reserve.value
    const coiny_amount = pool.data_decoded.coin_y_reserve.value

    let poolValue = BigDecimal(0)
    let poolValueNew = BigDecimal(0)
    if (whitelistx) {
      const value = await liquidSwap.coinList.calculateValueInUsd(coinx_amount, coinXInfo, timestamp, ctx.network)
      poolValue = poolValue.plus(value)
      const valueNew = coinx_amount.scaleDown(coinXInfo.decimals).multipliedBy(priceX)
      poolValueNew = poolValueNew.plus(valueNew)
      // tvlTotal.record(ctx, value, { pool: poolName, type: coinXInfo.token_type.type })

      let coinXTotal = volumeByCoin.get(coinXInfo.type)
      if (!coinXTotal) {
        coinXTotal = value
      } else {
        coinXTotal = coinXTotal.plus(value)
      }
      volumeByCoin.set(coinXInfo.type, coinXTotal)

      if (!whitelisty) {
        poolValue = poolValue.plus(value)
        poolValueNew = poolValueNew.plus(valueNew)
        // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type})
      }
    }
    if (whitelisty) {
      const value = await liquidSwap.coinList.calculateValueInUsd(coiny_amount, coinYInfo, timestamp, ctx.network)
      poolValue = poolValue.plus(value)
      const valueNew = scaleDown(coiny_amount, coinYInfo.decimals).multipliedBy(priceY)
      poolValueNew = poolValueNew.plus(valueNew)
      // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type })

      let coinYTotal = volumeByCoin.get(coinYInfo.type)
      if (!coinYTotal) {
        coinYTotal = value
      } else {
        coinYTotal = coinYTotal.plus(value)
      }
      volumeByCoin.set(coinYInfo.type, coinYTotal)

      if (!whitelistx) {
        poolValue = poolValue.plus(value)
        poolValueNew = poolValueNew.plus(valueNew)
      }
    }
    if (poolValue.isGreaterThan(1000)) {
      tvlByPool.record(ctx, poolValue, { pair, curve, ver })
      tvlByPoolNew.record(ctx, poolValueNew, { pair, curve, ver })

      if (curve == 'Uncorrelated') {
        const priceX = await getPriceForToken(coinXInfo.type, timestamp)
        const priceY = await getPriceForToken(coinYInfo.type, timestamp)
        if (priceX != 0 && priceY != 0) {
          const nX = scaleDown(coinx_amount, coinXInfo.decimals)
          const nY = scaleDown(coiny_amount, coinYInfo.decimals)
          const fee = scaleDown(pool.data_decoded.fee, 4)
          const feeFactor = fee.div(BigDecimal(1).minus(fee))

          for (const k of inputUsd) {
            // impactX = fee / (1 - fee) + inX / nX
            const inX = BigDecimal(k).div(priceX)
            const impactX = feeFactor.plus(inX.div(nX))
            priceImpact.record(ctx, impactX, {
              pair,
              curve,
              fee: fee.toString(),
              inputUsd: k.toString(),
              direction: 'X to Y',
              ver
            })

            const inY = BigDecimal(k).div(priceY)
            const impactY = feeFactor.plus(inY.div(nY))
            priceImpact.record(ctx, impactY, {
              pair,
              curve,
              fee: fee.toString(),
              inputUsd: k.toString(),
              direction: 'Y to X',
              ver
            })
          }
        }
      }
    }
    tvlAllValue = tvlAllValue.plus(poolValue)
  }

  tvlAll.record(ctx, tvlAllValue, { ver })

  for (const [k, v] of volumeByCoin) {
    const coinInfo = liquidSwap.coinList.whitelistCoins().get(k)
    if (!coinInfo) {
      throw Error('unexpected coin ' + k)
    }
    const price = await getPriceForToken(coinInfo.type, timestamp)
    priceGauge.record(ctx, price, { coin: coinInfo.symbol, ver })
    if (v.isGreaterThan(0)) {
      tvl.record(ctx, v, { coin: coinInfo.symbol, bridge: coinInfo.bridge, type: coinInfo.type, ver })
    }
  }
}

const minLocked = 1e4
let priceInUsd: Map<string, BigDecimal> = new Map<string, BigDecimal>()

async function calcPrice(coin: string, pools: TypedMoveResource<PoolType<any, any, any>>[], network: AptosNetwork) {
  const coinInfo = await getTokenInfoWithFallback(coin, network)
  if (coinInfo.symbol == 'USDC') {
    return BigDecimal(1)
  }
  let maxLocked = BigDecimal(0)
  let maxFrom = ''
  let res = undefined
  for (const pool of pools) {
    const curve = getCurve(pool.type_arguments[2])
    if (curve == 'Stable') {
      continue
    }

    if (pool.type_arguments[0] == coin) {
      const coinAmount = scaleDown(pool.data_decoded.coin_x_reserve.value, coinInfo.decimals)
      const pairedCoinInfo = await getTokenInfoWithFallback(pool.type_arguments[1], network)
      const pairedCoinPriceInUsd = priceInUsd.get(pool.type_arguments[1])
      const pairedCoinAmount = scaleDown(pool.data_decoded.coin_y_reserve.value, pairedCoinInfo.decimals)
      if (!pairedCoinPriceInUsd) {
        continue
      }

      const locked = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd)
      if (locked.gt(maxLocked) && locked.gt(minLocked)) {
        maxLocked = locked
        maxFrom = await getPair(pool.type_arguments[0], pool.type_arguments[1], network)
        res = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd).div(coinAmount)
      }
    } else if (pool.type_arguments[1] == coin) {
      const coinAmount = scaleDown(pool.data_decoded.coin_y_reserve.value, coinInfo.decimals)
      const pairedCoinInfo = await getTokenInfoWithFallback(pool.type_arguments[0], network)
      const pairedCoinPriceInUsd = priceInUsd.get(pool.type_arguments[0])
      const pairedCoinAmount = scaleDown(pool.data_decoded.coin_x_reserve.value, pairedCoinInfo.decimals)
      if (!pairedCoinPriceInUsd) {
        continue
      }

      const locked = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd)
      if (locked.gt(maxLocked) && locked.gt(minLocked)) {
        maxLocked = locked
        maxFrom = await getPair(pool.type_arguments[0], pool.type_arguments[1], network)
        res = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd).div(coinAmount)
      }
    }
  }
  if (res) {
    console.log(`got price of coin[${coinInfo.symbol}] at [${res}] from pair[${maxFrom}]`)
  } else {
    console.log(`failed to get price of coin[${coinInfo.symbol}]`)
  }
  return res
  // return BigDecimal(0)
}

// loadAllTypes(defaultMoveCoder())
AptosResourcesProcessor.bind({
  network: AptosNetwork.MOVEMENT_MAIN_NET,
  address: resourceAddress,
  baseLabels: { ver }
}).onTimeInterval(
  async (resources, ctx) => {
    // await syncLiquidSwapPools(resources, ctx)
    await liquidSwap.syncPools(resources, ctx)
  },
  60,
  24 * 60
)
