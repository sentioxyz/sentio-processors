import { EthChainId } from '@sentio/chain'
import { EthContext } from '@sentio/sdk/eth'
import { getPriceBySymbol, token } from '@sentio/sdk/utils'

export const network = EthChainId.MONAD_MAINNET
export const START_BLOCK = 38055300

export async function recordTvl(ctx: EthContext, asset: string, total: BigInt, project: string) {
  const info = await token.getERC20TokenInfo(ctx, asset)
  const price = await getPriceBySymbol(info.symbol, ctx.timestamp)
  if (!price) {
    console.warn('failed to get price for', info.symbol, ctx.address)
    return
  }
  const amount = total.scaleDown(info.decimal).multipliedBy(price)
  ctx.eventLogger.emit('tvl', {
    amount,
    project,
  })
}
