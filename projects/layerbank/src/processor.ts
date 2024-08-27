import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token } from '@sentio/sdk/utils'
import {
  BorrowCallTrace,
  getLayerbankContract,
  LayerbankContext,
  LayerbankProcessor,
  MarketRedeemEvent,
  MarketSupplyEvent,
  RepayBorrowCallTrace
} from './types/eth/layerbank.js'
import { getLtokenContractOnContext, LtokenContext, LtokenProcessor } from './types/eth/ltoken.js'

const address = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
const startBlock = 152083

async function recordBalance(ctx: LayerbankContext | LtokenContext, lToken: string, user: string, type: string) {
  const contract = getLtokenContractOnContext(ctx, lToken)
  const [supply, borrow, tokenInfo] = await Promise.all([
    contract.balanceOf(user),
    contract.borrowBalanceOf(user),
    token.getERC20TokenInfo(ctx, lToken)
  ])

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
