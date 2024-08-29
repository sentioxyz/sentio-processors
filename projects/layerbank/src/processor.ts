import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token as tokens } from '@sentio/sdk/utils'
import { getLayerbankContract, LayerbankContext, LayerbankProcessor } from './types/eth/layerbank.js'
import { getLtokenContract, getLtokenContractOnContext, LtokenContext, LtokenProcessor } from './types/eth/ltoken.js'
import { UserMarkets } from './schema/schema.js'

const address = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
const startBlock = 152083
// const startBlock = 8810000

const tokenInfos = new Map<string, { token: string; tokenInfo: tokens.TokenInfo }>()

async function recordBalance(ctx: LayerbankContext | LtokenContext, lToken: string, user: string, event = 'snapshot') {
  const { token, tokenInfo } = tokenInfos.get(lToken) || {}
  if (!tokenInfo) {
    console.warn('no token info', ctx.transactionHash, lToken)
    return
  }
  const contract = getLtokenContractOnContext(ctx, lToken)
  const { lTokenBalance, borrowBalance, exchangeRate } = await contract.accountSnapshot(user)
  const rate = scaleDown(exchangeRate, tokenInfo.decimal)

  const eventName = event == 'snapshot' ? event : 'balance'
  ctx.eventLogger.emit(eventName, {
    token_address: token,
    underlying_decimals: tokenInfo.decimal,
    token_symbol: tokenInfo.symbol,
    user_address: user,
    market: lToken,
    rate,
    supply_token: scaleDown(lTokenBalance, 18).multipliedBy(rate),
    borrow_token: scaleDown(borrowBalance, tokenInfo.decimal),
    type: event == 'snapshot' ? undefined : event
  })
}

const layerbank = getLayerbankContract(EthChainId.SCROLL, address)
const markets = await layerbank.allMarkets()

for (const market of markets) {
  const contract = getLtokenContract(EthChainId.SCROLL, market)
  let info, underlying
  try {
    underlying = await contract.underlying()
    info = await tokens.getERC20TokenInfo(EthChainId.SCROLL, underlying)
  } catch (e) {
    info = await tokens.getERC20TokenInfo(EthChainId.SCROLL, market)
  }
  tokenInfos.set(market, { token: underlying || market, tokenInfo: info })
  console.log('market', market, info.symbol, info.decimal)

  LtokenProcessor.bind({ address: market, startBlock, network: EthChainId.SCROLL })
    .onEventMint(async (evt, ctx) => {
      const { minter } = evt.args
      await recordBalance(ctx, market, minter, 'mint')
    })
    .onEventRedeem(async (evt, ctx) => {
      const { account } = evt.args
      await recordBalance(ctx, market, account, 'redeem')
    })
    .onEventBorrow(async (evt, ctx) => {
      const { account } = evt.args
      await recordBalance(ctx, market, account, 'borrow')
    })
    .onEventRepayBorrow(async (evt, ctx) => {
      const { borrower } = evt.args
      await recordBalance(ctx, market, borrower, 'repay')
    })
}

LayerbankProcessor.bind({ address, startBlock, network: EthChainId.SCROLL })
  .onEventMarketEntered(async (evt, ctx) => {
    const { account, lToken } = evt.args
    const snap = await ctx.store.get(UserMarkets, account)
    const markets = snap?.markets || []
    if (!markets.includes(lToken)) {
      markets.push(lToken)
    }
    await ctx.store.upsert(new UserMarkets({ id: account, markets }))
  })
  // .onEventMarketExited(async (evt, ctx) => {
  //   const { account, lToken } = evt.args
  //   const snap = await ctx.store.get(UserMarkets, account)
  //   const markets = (snap?.markets || []).filter((x) => x != lToken)
  //   await ctx.store.upsert(new UserMarkets({ id: account, markets }))
  // })
  .onTimeInterval(
    async (block, ctx) => {
      const snaps = await ctx.store.list(UserMarkets, [])
      for (const { id, markets } of snaps) {
        if (markets?.length) {
          await Promise.all(markets.map((market) => recordBalance(ctx, market, id)))
        }
      }
    },
    60 * 24,
    60 * 24 * 30
  )
