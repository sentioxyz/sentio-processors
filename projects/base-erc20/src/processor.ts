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

const erc721Cache = new LRUCache<string, boolean>({
  max: 100_000
})

async function getTokenInfo(ctx: ERC20Context) {
  const address = ctx.contract.address
  let info = tokenCache.get(address)
  if (!info) {
    try {
      const contract = getERC20ContractOnContext(ctx, address)
      const [decimals, symbol] = await Promise.all([await contract.decimals(), contract.symbol()])
      info = {
        decimals,
        symbol
      }
      tokenCache.set(address, info)
    } catch (e) {
      erc721Cache.set(address, true)
      console.error('xx', e)
    }
  }
  return info
}

ERC20Processor.bind({ address: '*', network: EthChainId.BASE }).onEventTransfer(
  async (evt, ctx) => {
    console.log('- erc721Cache', erc721Cache.size, ctx.address, ctx.contract.address)
    if (erc721Cache.get(ctx.contract.address)) {
      return
    }
    const { from, to, value } = evt.args
    const info = await getTokenInfo(ctx)
    if (!info?.decimals) {
      console.warn(`decimals not found for ${ctx.address}`)
    }
    ctx.eventLogger.emit('tx', {
      distinctId: from.toLowerCase(),
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      value_raw: value.asBigDecimal(),
      value: info?.decimals ? value.scaleDown(info.decimals) : value.asBigDecimal(),
      symbol: info?.symbol,
      tx_from: ctx.transaction?.from.toLowerCase(),
      tx_to: ctx.transaction?.to?.toLowerCase()
    })
  },
  undefined,
  { transaction: true }
)
