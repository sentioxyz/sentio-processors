// import { SouffleChefCampaign, CandyMachine } from './types/aptos/souffle.js'
import { AptosContext, AptosNetwork } from '@sentio/sdk/aptos'
import { coin, fungible_asset } from '@sentio/sdk/aptos/builtin/0x1'
import { getTokenInfoWithFallback, TokenInfo } from '@sentio/sdk/aptos/ext'
import { LRUCache } from 'lru-cache'

fungible_asset
  .bind({ network: AptosNetwork.MAIN_NET })
  .onEventDeposit(async (evt, ctx) => {
    return handleBalanceChange('deposit', evt, ctx)
  })
  .onEventWithdraw(async (evt, ctx) => {
    return handleBalanceChange('withdraw', evt, ctx)
  })

const tokenCache = new LRUCache<string, TokenInfo>({
  max: 100_000
})

async function getTokenInfo(address: string) {
  let info = tokenCache.get(address)
  if (!info) {
    try {
      info = await getTokenInfoWithFallback(address)
      tokenCache.set(address, info)
    } catch (e) {
      console.error(e)
    }
  }
  return info
}

function normalizeAddress(address: string) {
  return '0x' + (address.startsWith('0x') ? address.slice(2) : address).padStart(64, '0')
}

async function handleBalanceChange(
  type: string,
  evt: fungible_asset.DepositInstance | fungible_asset.WithdrawInstance,
  ctx: AptosContext
) {
  const { amount, store } = evt.data_decoded
  const resource = await ctx.getClient().getTypedAccountResource({
    accountAddress: normalizeAddress(store),
    resourceType: fungible_asset.FungibleStore.type()
  })
  const asset = resource.metadata
  const tokenInfo = await getTokenInfo(asset)
  if (
    (!tokenInfo?.name?.toUpperCase()?.includes('USD') && !tokenInfo?.symbol?.toUpperCase()?.includes('USD')) ||
    tokenInfo.symbol.startsWith('LP')
  ) {
    return
  }

  ctx.eventLogger.emit(type, {
    distinctId: ctx.transaction.sender,
    asset,
    symbol: tokenInfo.symbol,
    amount: amount.scaleDown(tokenInfo.decimals)
  })
}
