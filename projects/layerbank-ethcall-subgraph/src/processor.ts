import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import { token as tokens } from '@sentio/sdk/utils'
import { getLayerbankContract, LayerbankContext, LayerbankProcessor } from './types/eth/layerbank.js'
import { getLtokenContract, getLtokenContractOnContext } from './types/eth/ltoken.js'
import { getAccountStatesForAddressByPoolAtBlock } from './helper/getUserStates.js'

const CORE_CONTRACT = '0xEC53c830f4444a8A56455c6836b5D2aA794289Aa'
const startBlock = 8841366

const tokenInfos = new Map<string, { underlying: string; underlyingTokenInfo: tokens.TokenInfo }>()


// set markets 
const coreContract = getLayerbankContract(EthChainId.SCROLL, CORE_CONTRACT)
const markets = await coreContract.allMarkets()

for (const market of markets) {
  const contract = getLtokenContract(EthChainId.SCROLL, market)
  let underlyingTokenInfo, underlying
  try {
    underlying = (await contract.underlying()).toLowerCase()
    //handle native eth
    if (underlying == "0x0000000000000000000000000000000000000000")
      underlying = "0x5300000000000000000000000000000000000004"

    underlyingTokenInfo = await tokens.getERC20TokenInfo(EthChainId.SCROLL, underlying)
    tokenInfos.set(market.toLowerCase(), { underlying, underlyingTokenInfo })
    console.log('setting market map', market.toLowerCase(), underlying, underlyingTokenInfo.symbol, underlyingTokenInfo.decimal)
  } catch (e) {
    console.log("set market error", market.toLowerCase())
  }
}

async function recordBalance(ctx: LayerbankContext, lToken: string, user: string) {
  const { underlying, underlyingTokenInfo } = tokenInfos.get(lToken) || {}
  if (!underlyingTokenInfo) {
    console.warn('no token info', ctx.transactionHash, lToken)
    return
  }

  if (!lToken || !underlyingTokenInfo) return
  const contract = getLtokenContractOnContext(ctx, lToken)
  const { lTokenBalance, borrowBalance, exchangeRate } = await contract.accountSnapshot(user)


  ctx.eventLogger.emit("Snapshot", {
    underlying_token: underlying,
    underlying_decimals: underlyingTokenInfo.decimal,
    token_symbol: underlyingTokenInfo.symbol,
    user_address: user,
    market: lToken,
    exchangeRate,
    //underlying balance
    supply_token: scaleDown(lTokenBalance, 18).multipliedBy(scaleDown(exchangeRate, underlyingTokenInfo.decimal)),
    //underlying borrow
    borrow_token: scaleDown(borrowBalance, underlyingTokenInfo.decimal)
  })
}


LayerbankProcessor.bind({
  address: CORE_CONTRACT,
  startBlock,
  network: EthChainId.SCROLL
})
  .onTimeInterval(
    async (_, ctx) => {
      //get all user, market pairs
      const states = await getAccountStatesForAddressByPoolAtBlock(ctx)

      //snapshot
      const t1 = new Date().getTime()

      await Promise.all(
        states.map(({ account, token }) => recordBalance(ctx, token, account))
      )

      const t2 = new Date().getTime()
      ctx.eventLogger.emit("processingTimeLog", {
        user_count: states.length,
        time: t2 - t1
      })

    },
    60,
    60 * 24 * 30
  )
