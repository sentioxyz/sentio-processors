import { liquidity_pool } from './types/aptos/cellana.js'
import { AptosDex, getCoinInfo, getPairValue } from '@sentio/sdk/aptos/ext'

import {
  cellanaTvl,
  cellanaTvlAll,
  cellanaTvlByPool,
  cellanaVolume,
  cellanaVolumeByCoin,
  recordAccount,
} from './metrics.js'
import { AptosContext, AptosResourcesProcessor } from '@sentio/sdk/aptos'
import { BigDecimal } from '@sentio/sdk'
import { MoveAddressType } from '@aptos-labs/ts-sdk'

const startVersion = undefined

async function getPair(coinx: string, coiny: string, coinList: any): Promise<string> {
  const coinXInfo = await coinList.getCoinInfo(coinx)
  const coinYInfo = await coinList.getCoinInfo(coiny)
  const symbolX = coinXInfo.symbol || coinx
  const symbolY = coinYInfo.symbol || coiny
  if (symbolX.localeCompare(symbolY) > 0) {
    return `${symbolY}-${symbolX}`
  }
  return `${symbolX}-${symbolY}`
}

async function recordTradingVolume(
  ctx: any,
  coinx: string,
  coiny: string,
  coinXAmount: bigint,
  coinYAmount: bigint,
  coinList: any,
  extraLabels?: any,
): Promise<BigDecimal> {
  let result = BigDecimal(0)

  const whitelistx = coinList.whiteListed(coinx)
  const whitelisty = coinList.whiteListed(coiny)
  if (!whitelistx && !whitelisty) {
    return result
  }
  const coinXInfo = await coinList.getCoinInfo(coinx)
  const coinYInfo = await coinList.getCoinInfo(coiny)
  const timestamp = ctx.getTimestamp()
  let resultX = BigDecimal(0)
  let resultY = BigDecimal(0)
  const pair = await getPair(coinx, coiny, coinList)
  const baseLabels: Record<string, string> = extraLabels ? { ...extraLabels, pair } : { pair }
  // if (whitelistx) {
  resultX = await coinList.calculateValueInUsd(coinXAmount, coinXInfo, timestamp, ctx.network)
  // }
  // if (whitelisty) {
  resultY = await coinList.calculateValueInUsd(coinYAmount, coinYInfo, timestamp, ctx.network)
  // }
  if (resultX.eq(0)) {
    resultX = BigDecimal(resultY)
  }
  if (resultY.eq(0)) {
    resultY = BigDecimal(resultX)
  }
  const total = resultX.plus(resultY)
  if (total.gt(0)) {
    cellanaVolume.record(ctx, total, {
      ...baseLabels,
      bridge: coinXInfo.bridge,
    })
  }
  if (resultX.gt(0)) {
    cellanaVolumeByCoin.record(ctx, resultX, {
      coin: coinXInfo.symbol || coinx,
      bridge: coinXInfo.bridge,
      type: coinXInfo.token_type.type,
    })
  }
  if (resultY.gt(0)) {
    cellanaVolumeByCoin.record(ctx, resultY, {
      coin: coinYInfo.symbol || coiny,
      bridge: coinYInfo.bridge,
      type: coinYInfo.token_type.type,
    })
  }
  result = resultX.plus(resultY).div(2)
  return result
}

const poolNameMap = new Map<MoveAddressType, string>()

async function getPoolName(ctx: AptosContext, pool: MoveAddressType) {
  if (!poolNameMap.has(pool)) {
    const metadata = await ctx.getClient().account.getAccountResource<{
      name: string
    }>({ accountAddress: pool, resourceType: '0x1::fungible_asset::Metadata' })
    poolNameMap.set(pool, metadata.name)
    ctx.eventLogger.emit('pool', {
      source: 'cellana',
      pool,
      name: metadata.name,
    })
  }

  return poolNameMap.get(pool)
}

// https://aptoscan.com/objects/0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12#resources
const CELL = '0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12'

liquidity_pool.bind({ startVersion }).onEventSwapEvent(async (evt, ctx) => {
  let { from_token: coinX, to_token: coinY, amount_out, amount_in } = evt.data_decoded
  if (coinX == CELL) {
    coinX += '::asset::CELL'
  }
  if (coinY == CELL) {
    coinY += '::asset::CELL'
  }
  const { coinList } = CELLANA_SWAP_APTOS

  const value = await recordTradingVolume(ctx, coinX, coinY, amount_in, amount_out, coinList)
  if (recordAccount) {
    ctx.eventLogger.emit('vol', {
      distinctId: ctx.transaction.sender,
      account: ctx.transaction.sender,
      value: value.toNumber(),
    })
  }
  const coinXInfo = await getCoinInfo(coinX)
  const coinYInfo = await getCoinInfo(coinY)
  ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinXInfo.bridge })
  ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinYInfo.bridge })

  const whitelistX = coinList.whiteListed(coinX)
  const whitelistY = coinList.whiteListed(coinY)
  const timestamp = ctx.getTimestamp()

  // TVL metrics.
  if (!whitelistX && !whitelistY) {
    return
  }
  const syncEvent = ctx.transaction.events[ctx.eventIndex + 1].data as liquidity_pool.SyncEvent
  const poolName = await getPoolName(ctx, syncEvent.pool)
  // LP-USDC-WBTC, e.g. https://aptoscan.com/objects/0x1e9cf70ab184026fa1eafc3cc4a4bd0012418425049e60856ea249f72f94ba8a#resources
  const [, token1, token2] = poolName?.split('-') || []
  let reserveX, reserveY
  if (
    coinXInfo.symbol?.endsWith(token1) ||
    coinYInfo.symbol?.endsWith(token2) ||
    (!coinXInfo.symbol && !coinYInfo.symbol)
  ) {
    reserveX = syncEvent.reserves_1
    reserveY = syncEvent.reserves_2
  } else {
    reserveX = syncEvent.reserves_2
    reserveY = syncEvent.reserves_1
  }
  const pair = await getPair(coinX, coinY, coinList)
  let tvlX = BigDecimal(0)
  let tvlY = BigDecimal(0)
  // if (whitelistX) {
  tvlX = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(BigInt(reserveX), coinXInfo, timestamp, ctx.network)
  if (tvlX.isGreaterThan(0)) {
    cellanaTvl.record(ctx, tvlX, {
      coin: coinXInfo.symbol || coinX,
      bridge: coinXInfo.bridge,
      type: coinXInfo.token_type.type,
    })
  }
  // }
  // if (whitelistY) {
  tvlY = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(BigInt(reserveY), coinYInfo, timestamp, ctx.network)
  if (tvlY.isGreaterThan(0)) {
    cellanaTvl.record(ctx, tvlY, {
      coin: coinYInfo.symbol || coinY,
      bridge: coinYInfo.bridge,
      type: coinYInfo.token_type.type,
    })
  }
  // }

  if (tvlX.eq(0)) {
    tvlX = BigDecimal(tvlY)
  }
  if (tvlY.eq(0)) {
    tvlY = BigDecimal(tvlX)
  }

  const poolValue = tvlX.plus(tvlY)

  if (poolValue.isGreaterThan(0)) {
    cellanaTvlByPool.record(ctx, poolValue, { pair })
  }
})

const CELLANA_SWAP_APTOS = new AptosDex<liquidity_pool.SyncEvent>(
  cellanaVolume,
  cellanaVolumeByCoin,
  cellanaTvlAll,
  cellanaTvl,
  cellanaTvlByPool,
  {
    getXReserve: (pool) => pool.reserves_1,
    getYReserve: (pool) => pool.reserves_2,
    getExtraPoolTags: (_) => {},
    poolType: liquidity_pool.SyncEvent.type(),
  },
)
