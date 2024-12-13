import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token as tokens } from '@sentio/sdk/utils'
import { getLayerbankContract, LayerbankContext, LayerbankProcessor } from './types/eth/layerbank.js'
import { getLtokenContract, getLtokenContractOnContext, LtokenContext, LtokenProcessor } from './types/eth/ltoken.js'
import { UserBalance } from './schema/schema.js'
import { getRatemodelContractOnContext } from './types/eth/ratemodel.js'
import { GLOBAL_CONFIG } from "@sentio/runtime";

GLOBAL_CONFIG.execution = {
  forceExactBlockTime: true
}

const CORE_CONTRACT = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
const startBlock = 8841366

const tokenInfos = new Map<string, { token: string; tokenInfo: tokens.TokenInfo }>()

interface MarketConstant {
  market: string,
  exchangeRate: bigint,
  snapshotAccInterestIndex: bigint
}

async function recordUserBalance(ctx: LayerbankContext | LtokenContext, lToken: string, user: string, eventName: string) {
  const contract = getLtokenContractOnContext(ctx, lToken)
  const { lTokenBalance, borrowBalance, exchangeRate } = await contract.accountSnapshot(user)

  await ctx.store.upsert(new UserBalance({
    id: `${user}-${lToken}`,
    account: user,
    market: lToken,
    lTokenBalance,
    borrowBalance,
    exchangeRate,
    timestamp: ctx.timestamp.toString(),
    txHash: ctx.transactionHash,
    trigger: eventName
  }))
}


async function getMarketConstants(ctx: LayerbankContext) {
  const marketConstants: MarketConstant[] = []

  for (const market of markets) {
    //update pending accrue snapshot
    const lTokenContract = getLtokenContractOnContext(ctx, market)
    const rateModelAddress = await lTokenContract.getRateModel()
    const exchangeRate = await lTokenContract.exchangeRate()

    const rateModelContract = getRatemodelContractOnContext(ctx, rateModelAddress)
    const borrowRate = await rateModelContract.getBorrowRate(
      await lTokenContract.getCash(),
      await lTokenContract.totalBorrow(),
      await lTokenContract.totalReserve()
    )

    const lastAccruedTime = await lTokenContract.lastAccruedTime()
    const interestFactor = borrowRate * (BigInt(ctx.timestamp.toString()) - lastAccruedTime)

    const accInterestIndex = await lTokenContract.accInterestIndex()
    const snapshotAccInterestIndex = accInterestIndex + interestFactor * accInterestIndex / 10n ** 18n

    marketConstants.push({
      market,
      exchangeRate,
      snapshotAccInterestIndex
    })
  }

  return marketConstants
}


async function snapshot(ctx: LayerbankContext | LtokenContext, lToken: string, user: string, marketConstants: MarketConstant[]) {
  const { token, tokenInfo } = tokenInfos.get(lToken) || {}
  if (!tokenInfo) {
    console.warn('no token info', ctx.transactionHash, lToken)
    return
  }

  const marketConstant = marketConstants.find(c => c.market === lToken)

  const userBalance = await ctx.store.get(UserBalance, `${user}-${lToken}`)

  if (userBalance && marketConstant) {
    const snapshotBorrowBalance = userBalance.borrowBalance < 0n ? 0n : userBalance.borrowBalance * marketConstant.snapshotAccInterestIndex / userBalance.exchangeRate

    const snapshotUnderlyingBalance = userBalance.lTokenBalance * marketConstant.exchangeRate / 10n ** 18n

    ctx.eventLogger.emit("Snapshot", {
      token_address: token,
      underlying_decimals: tokenInfo.decimal,
      token_symbol: tokenInfo.symbol,
      user_address: user,
      market: lToken,
      snapshotBorrowBalance,
      snapshotUnderlyingBalance,
      snapshotExchangeRate: marketConstant.exchangeRate,
      snapshotAccInterestIndex: marketConstant.snapshotAccInterestIndex,

      //debug
      lTokenBalance: userBalance.lTokenBalance,
      borrowBalance: userBalance.borrowBalance,
      exchangeRate: userBalance.exchangeRate,
      userBalanceTimestamp: userBalance.timestamp
    })
  }
}

const coreContract = getLayerbankContract(EthChainId.SCROLL, CORE_CONTRACT)
const markets = await coreContract.allMarkets()

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

  LtokenProcessor.bind({ address: market, network: EthChainId.SCROLL })
    .onEventMint(async (evt, ctx) => {
      const { minter } = evt.args
      await recordUserBalance(ctx, market, minter, evt.name)
    })
    .onEventRedeem(async (evt, ctx) => {
      const { account } = evt.args
      await recordUserBalance(ctx, market, account, evt.name)
    })
    .onEventBorrow(async (evt, ctx) => {
      const { account } = evt.args
      await recordUserBalance(ctx, market, account, evt.name)
    })
    .onEventRepayBorrow(async (evt, ctx) => {
      const { borrower } = evt.args
      await recordUserBalance(ctx, market, borrower, evt.name)
    })
    .onEventLiquidateBorrow(async (evt, ctx) => {
      const { borrower } = evt.args
      await recordUserBalance(ctx, market, borrower, evt.name)
    })
}

LayerbankProcessor.bind({
  address: CORE_CONTRACT,
  startBlock,
  network: EthChainId.SCROLL
})
  .onTimeInterval(
    async (_, ctx) => {
      const userBalances = await ctx.store.list(UserBalance, [])
      const marketConstants = await getMarketConstants(ctx)
      await Promise.all(
        userBalances.map(({ id, market }) => snapshot(ctx, market, id, marketConstants))
      )
    },
    60 * 24,
    60 * 24 * 30
  )
