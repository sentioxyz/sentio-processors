import { Counter } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Context, getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { LRUCache } from 'lru-cache'

interface TokenInfo {
  decimals: bigint
  symbol: string
}

const tokenCache = new LRUCache<string, TokenInfo>({
  max: 100_000
})

async function getTokenInfo(ctx: ERC20Context) {
  let info = tokenCache.get(ctx.address)
  if (!info) {
    try {
      const contract = getERC20ContractOnContext(ctx, ctx.address)
      const [decimals, symbol] = await Promise.all([await contract.decimals(), contract.symbol()])
      info = {
        decimals,
        symbol
      }
      tokenCache.set(ctx.address, info)
    } catch (e) {}
  }
  return info
}

ERC20Processor.bind({ address: '*', network: EthChainId.BASE }).onEventTransfer(
  async (evt, ctx) => {
    const { from, to, value } = evt.args
    const tx_from = ctx.transaction?.from.toLowerCase()
    const info = await getTokenInfo(ctx)
    if (!info?.decimals) {
      console.warn(`decimals not found for ${ctx.address}`)
    }
    ctx.eventLogger.emit('tx', {
      distinctId: from,
      from,
      to,
      value: info?.decimals ? value.scaleDown(info.decimals) : value,
      tx_from,
      symbol: info?.symbol
    })
  },
  undefined,
  { transaction: true }
)
