import { EthChainId } from '@sentio/chain'
import { Gauge } from '@sentio/sdk'
import { EthContext } from '@sentio/sdk/eth'
import { getPriceBySymbol, token } from '@sentio/sdk/utils'
import { ZeroAddress } from 'ethers'

export const network = EthChainId.MONAD_MAINNET
export const START_BLOCK = 36000000

const tvl = Gauge.register('tvl')

const infoMON = {
  decimal: 18,
  symbol: 'MON',
  name: 'Monad',
}

export async function getTokenInfo(ctx: EthContext, addr: string) {
  return addr == ZeroAddress ? infoMON : await token.getERC20TokenInfo(ctx, addr)
}

export async function recordTx(ctx: EthContext, distinctId: string, project: string) {
  ctx.eventLogger.emit('tx-defi', {
    distinctId,
    project,
  })
}

export async function recordTvl(ctx: EthContext, asset: string, total: BigInt, pool: string, project: string) {
  const info = await getTokenInfo(ctx, asset)
  const price = await getPriceBySymbol(info.symbol, ctx.timestamp)
  if (!price) {
    console.warn('failed to get price for', info.symbol, ctx.address)
    return
  }
  const amount = total.scaleDown(info.decimal).multipliedBy(price)
  ctx.eventLogger.emit('tvl', {
    amount,
    pool,
    project,
  })
  tvl.record(ctx, amount, {
    pool,
    project,
  })
}
