import { SeniorPoolContext, SeniorPoolProcessor} from './types/seniorpool_processor'
import { TranchedPoolContext, TranchedPoolProcessor } from './types/tranchedpool_processor'
import { CreditLineContext, CreditLineProcessor } from './types/creditline_processor'

import * as goldfinchPools from "./goldfinchPools.json"
// import { getChainName } from '@sentio/sdk';

// TODO provide builtin
const getChainName = function(id: any): string {
  return String(CHAIN_ID_MAP.get(Number(id)))
}

const CHAIN_ID_MAP = new Map<number, String>(
  [
    [1, "Ethereum"],
    [10, "Optimism"],
    [25, "Cronos"],
    [56, "BSC"],
    [66, "OKC"],
    [128, "Huobi"],
    [137, "Polygon"],
    [250, "Fantom"],
    [321, "KCC"],
    [42161, "Arbitrum"],
    [43114, "Avalanche"]
  ]
)
const startBlock = 13096883

// ETH addresses
const seniorPoolAddress = "0x8481a6ebaf5c7dabc3f7e09e44a89531fd31f822"

const seniorPoolHandler = async function(_:any, ctx: SeniorPoolContext) {
  const totalLoansOutstanding = Number((await ctx.contract.totalLoansOutstanding()).toBigInt() / 10n**6n)
  const sharePrice = Number((await ctx.contract.sharePrice()).toBigInt() / 10n**6n)
  const assets = Number((await ctx.contract.assets()).toBigInt() / 10n**6n)

  ctx.meter.Histogram('goldfinch_totalLoansOutstanding').record(totalLoansOutstanding)
  ctx.meter.Histogram('goldfinch_sharePrice').record(sharePrice)
  ctx.meter.Histogram('goldfinch_assets').record(assets)
}

SeniorPoolProcessor.bind(seniorPoolAddress)
.startBlock(startBlock)
.onBlock(seniorPoolHandler)

// console.log("beging loop")
// console.log(goldfinchPools)
// batch handle Tranched Pools
for (let i = 0; i < goldfinchPools.data.length; i++) {
  const tranchedPool = goldfinchPools.data[i];

  // console.log(tranchedPool)

  const handler = async function(_:any, ctx: CreditLineContext) {
    const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n**6n)

    ctx.meter.Histogram('tranchedPool_balance').record(loanBalance, {"idx" : String(i)})
  }

  CreditLineProcessor.bind(tranchedPool.creditLineAddress)
  .startBlock(tranchedPool.creditLineStartBlock)
  .onBlock(handler)
}