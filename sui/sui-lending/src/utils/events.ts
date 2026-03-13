import { SuiContext, SuiNetwork } from '@sentio/sdk/sui'
import { getPriceByType } from '@sentio/sdk/utils'
import { getCoinMetadata } from './coin.js'
import { scaleDown } from '@sentio/sdk'

interface LendingEvent {
  project: string
  coinType: string
  amount: bigint
}

async function getUSD(ctx: SuiContext, coinType: string, amount: bigint, decimals: number) {
  const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
  return price ? scaleDown(amount * BigInt(Math.floor(price * 1e10)), decimals + 10) : undefined
}

async function emitLendingEvent(ctx: SuiContext, { project, coinType, amount }: LendingEvent, eventName: string) {
  const metadata = await getCoinMetadata(ctx, coinType)
  if (!metadata) {
    console.warn('No metadata for', coinType)
    return
  }

  ctx.eventLogger.emit(eventName, {
    distinctId: ctx.transaction.transaction?.data.sender,
    project,
    coin_symbol: metadata.symbol,
    amount: scaleDown(amount, metadata.decimals),
    usd_amount: await getUSD(ctx, coinType, amount, metadata.decimals),
  })
}

export async function emitDepositEvent(ctx: SuiContext, event: LendingEvent) {
  return emitLendingEvent(ctx, event, 'deposit')
}

export async function emitWithdrawEvent(ctx: SuiContext, event: LendingEvent) {
  return emitLendingEvent(ctx, event, 'withdraw')
}

export async function emitBorrowEvent(ctx: SuiContext, event: LendingEvent) {
  return emitLendingEvent(ctx, event, 'borrow')
}

export async function emitRepayEvent(ctx: SuiContext, event: LendingEvent) {
  return emitLendingEvent(ctx, event, 'repay')
}

// --- Multi-market event helpers ---

interface MarketLendingEvent {
  project: string
  coinType: string | undefined
  amount: bigint
  sender: string
  market_id: bigint
  user?: string
  to?: string
}

export async function emitMarketLendingEvent(ctx: SuiContext, data: MarketLendingEvent, eventType: string) {
  if (!data.coinType) {
    console.warn(`[${eventType}] Coin type not found, market_id=${data.market_id}`)
    return
  }
  const metadata = await getCoinMetadata(ctx, data.coinType)
  if (!metadata) {
    console.warn(`[${eventType}] No metadata for ${data.coinType}`)
    return
  }

  ctx.eventLogger.emit(eventType, {
    distinctId: data.sender,
    project: data.project,
    coin_symbol: metadata.symbol,
    amount: scaleDown(data.amount, metadata.decimals),
    usd_amount: await getUSD(ctx, data.coinType, data.amount, metadata.decimals),
    market_id: data.market_id.toString(),
    ...(data.user && { user: data.user }),
    ...(data.to && { to: data.to }),
  })
}

export function emitRawEvent(ctx: SuiContext, eventName: string, fields: Record<string, unknown>) {
  ctx.eventLogger.emit(eventName, {
    distinctId: ctx.transaction.transaction?.data.sender,
    project: 'navi',
    ...fields,
  })
}
