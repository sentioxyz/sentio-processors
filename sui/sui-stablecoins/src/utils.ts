import { SuiContext, SuiObjectContext } from '@sentio/sdk/sui'
import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'

// export const START_CHECKPOINT = 213450000n
export const START_CHECKPOINT = 206000000n

interface PoolInfo {
  symbol_a: string
  symbol_b: string
  decimal_a: number
  decimal_b: number
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

export function getPoolCoins(type: string) {
  const start = type.indexOf('<')
  const end = type.indexOf('>')
  const [coinA, coinB] = type.slice(start + 1, end).split(',')
  return [coinA.trim(), coinB.trim()]
}

async function buildPoolInfo(ctx: SuiContext | SuiObjectContext, pool: string): Promise<PoolInfo> {
  let [symbol_a, symbol_b, decimal_a, decimal_b] = ['', '', 0, 0]
  try {
    const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
    let [coin_a_full_address, coin_b_full_address] = ['', '']
    if (obj.data?.type) {
      ;[coin_a_full_address, coin_b_full_address] = getPoolCoins(obj.data.type)
    }
    const coinInfo_a = await getCoinInfoWithFallback(coin_a_full_address)
    const coinInfo_b = await getCoinInfoWithFallback(coin_b_full_address)
    symbol_a = coinInfo_a.symbol
    symbol_b = coinInfo_b.symbol
    decimal_a = coinInfo_a.decimals
    decimal_b = coinInfo_b.decimals
  } catch (e) {
    console.log(`Build pool error`, e)
  }

  return {
    symbol_a,
    symbol_b,
    decimal_a,
    decimal_b
  }
}

export const getPoolInfo = async function (ctx: SuiContext | SuiObjectContext, pool: string): Promise<PoolInfo> {
  let infoPromise = poolInfoMap.get(pool)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx, pool)
    poolInfoMap.set(pool, infoPromise)
    console.log('set poolInfoMap for ' + pool)
  }
  return await infoPromise
}

export function recordTx(ctx: SuiContext, distinctId: string, symbol: string, platform: string) {
  ctx.eventLogger.emit('tx', {
    distinctId,
    symbol,
    platform
  })
}

export function recordSwap(
  ctx: SuiContext,
  distinctId: string,
  pair: string,
  decimalX: number,
  decimalY: number,
  amountX: bigint,
  amountY: bigint,
  platform: string
) {
  ctx.eventLogger.emit('swap', {
    distinctId,
    pair,
    amount: BigInt(amountX).scaleDown(decimalX).plus(BigInt(amountY).scaleDown(decimalY)).div(2),
    platform
  })
}
