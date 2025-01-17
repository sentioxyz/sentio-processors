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
