import { AptosContext } from '@sentio/sdk/aptos'

export const DEFI_START_VERSION = 3550000000

export function recordTx(ctx: AptosContext, distinctId: string, symbol: string, platform: string) {
  ctx.eventLogger.emit('tx', {
    distinctId: ctx.transaction.sender,
    symbol,
    platform
  })
}

export function recordSwap(ctx: AptosContext, distinctId: string, coinX: string, coinY: string, platform: string) {
  ctx.eventLogger.emit('swap', {
    distinctId: ctx.transaction.sender,
    coinX,
    coinY,
    platform
  })
}
