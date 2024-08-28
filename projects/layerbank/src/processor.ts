import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token as tokens } from '@sentio/sdk/utils'
import { getLayerbankContract, LayerbankContext, LayerbankProcessor } from './types/eth/layerbank.js'
import { getLtokenContract, getLtokenContractOnContext, LtokenContext, LtokenProcessor } from './types/eth/ltoken.js'

const address = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
const startBlock = 152083
// const startBlock = 8144000

const tokenInfos = new Map<string, tokens.TokenInfo>()

async function recordBalance(ctx: LtokenContext, lToken: string, user: string, type: string) {
  const tokenInfo = tokenInfos.get(lToken)
  if (!tokenInfo) {
    console.warn('no token info', ctx.transactionHash, lToken)
    return
  }
  const contract = getLtokenContractOnContext(ctx, lToken)
  const [supply, borrow] = await Promise.all([contract.balanceOf(user), contract.borrowBalanceOf(user)])

  ctx.eventLogger.emit('balance', {
    lToken,
    user,
    symbol: tokenInfo.symbol,
    supply: scaleDown(supply, tokenInfo.decimal),
    borrow: scaleDown(borrow, tokenInfo.decimal),
    type
  })
}

const layerbank = getLayerbankContract(EthChainId.SCROLL, address)
const markets = await layerbank.allMarkets()

for (const market of markets) {
  const contract = getLtokenContract(EthChainId.SCROLL, market)
  let info
  try {
    const underlying = await contract.underlying()
    info = await tokens.getERC20TokenInfo(EthChainId.SCROLL, underlying)
  } catch (e) {
    info = await tokens.getERC20TokenInfo(EthChainId.SCROLL, market)
  }
  tokenInfos.set(market, info)
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
