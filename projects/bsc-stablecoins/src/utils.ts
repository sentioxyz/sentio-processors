import { EthChainId, EthContext } from '@sentio/sdk/eth'

export const network = EthChainId.BSC

// export const START_BLOCK = 70850000
export const START_BLOCK = 67600000

export function recordTx(ctx: EthContext, distinctId: string, platform: string) {
  ctx.eventLogger.emit('tx', {
    distinctId,
    platform,
  })
}

export function recordSwap(
  ctx: EthContext,
  distinctId: string,
  pair: string,
  decimalX: number,
  decimalY: number,
  amountX: bigint,
  amountY: bigint,
  platform: string,
) {
  ctx.eventLogger.emit('swap', {
    distinctId,
    pair,
    amount: BigInt(amountX).scaleDown(decimalX).plus(BigInt(amountY).scaleDown(decimalY)).div(2),
    platform,
  })
}
