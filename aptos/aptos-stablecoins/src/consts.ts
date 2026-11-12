import { BigDecimal } from '@sentio/sdk'
import { AptosContext } from '@sentio/sdk/aptos'
import { TokenInfo } from '@sentio/sdk/aptos/ext'

export const DEFI_START_VERSION = 3550000000

export function recordTx(ctx: AptosContext, distinctId: string, symbol: string, platform: string) {
  ctx.eventLogger.emit('tx', {
    distinctId: ctx.transaction.sender,
    symbol,
    platform
  })
}

export function recordSwap(
  ctx: AptosContext,
  distinctId: string,
  coinX: TokenInfo,
  coinY: TokenInfo,
  amountX: bigint,
  amountY: bigint,
  platform: string
) {
  ctx.eventLogger.emit('swap', {
    distinctId: ctx.transaction.sender,
    coinX: coinX.symbol,
    coinY: coinY.symbol,
    amount: amountX.scaleDown(coinX.decimals).plus(amountY.scaleDown(coinY.decimals)).div(2),
    platform
  })
}
