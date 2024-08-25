import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token } from '@sentio/sdk/utils'
import {
  BorrowCallTrace,
  LayerbankContext,
  LayerbankProcessor,
  MarketRedeemEvent,
  MarketSupplyEvent,
  RepayBorrowCallTrace
} from './types/eth/layerbank.js'
import { getLtokenContractOnContext } from './types/eth/ltoken.js'

const address = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
// const startBlock = 152083
const startBlock = 8730000

async function recordBalance(ctx: LayerbankContext, lToken: string, user: string, type: 'supply' | 'borrow') {
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

async function recordBalanceOnCall(call: BorrowCallTrace | RepayBorrowCallTrace, ctx: LayerbankContext) {
  const { lToken, amount } = call.args
  const sender = ctx.transaction?.from
  if (sender) {
    await recordBalance(ctx, lToken, sender, 'borrow')
  }
}

async function recordBalanceOnEvent(event: MarketSupplyEvent | MarketRedeemEvent, ctx: LayerbankContext) {
  const { user, lToken, uAmount } = event.args
  await recordBalance(ctx, lToken, user, 'supply')
}

LayerbankProcessor.bind({ address, startBlock, network: EthChainId.SCROLL })
  .onCallBorrow(recordBalanceOnCall, { transaction: true })
  .onCallRepayBorrow(recordBalanceOnCall, { transaction: true })
  .onEventMarketSupply(recordBalanceOnEvent)
  .onEventMarketRedeem(recordBalanceOnEvent)
  .onCallBorrowBehalf(async (call, ctx) => {
    const { borrower, lToken } = call.args
    await recordBalance(ctx, lToken, borrower, 'borrow')
  })
  .onCallLiquidateBorrow(async (call, ctx) => {
    const { borrower, lTokenBorrowed } = call.args
    await recordBalance(ctx, lTokenBorrowed, borrower, 'borrow')
  })
