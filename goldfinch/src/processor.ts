import { SeniorPoolContext, SeniorPoolProcessor} from './types/seniorpool_processor'
import {
  TranchedPoolContext,
  TranchedPoolProcessor,
  TranchedPoolProcessorTemplate
} from './types/tranchedpool_processor'
import { CreditLineContext, CreditLineProcessor, CreditLineProcessorTemplate } from './types/creditline_processor'

import * as goldfinchPools from "./goldfinchPools.json"
import { GoldfinchFactoryProcessor } from "./types/goldfinchfactory_processor";
import { CreditDeskProcessor } from "./types/creditdesk_processor";

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

SeniorPoolProcessor.bind({address: seniorPoolAddress, startBlock: startBlock})
  .onBlock(seniorPoolHandler)


const creditLineTemplate = new CreditLineProcessorTemplate()
  .onBlock(async function(_:any, ctx: CreditLineContext) {
      const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n**6n)
      ctx.meter.Histogram('creditLine_balance').record(loanBalance)
    }
  )

// add TODO push contract level label
GoldfinchFactoryProcessor.bind({address: "0xd20508E1E971b80EE172c73517905bfFfcBD87f9", startBlock: 11370655})
  .onCreditLineCreated(async function (event, ctx) {
    creditLineTemplate.bind({
      address: event.args.creditLine,
      startBlock: ctx.blockNumber
    })
  })

CreditDeskProcessor.bind({address: "0xb2Bea2610FEEfA4868C3e094D2E44b113b6D6138", startBlock: 11370659})
  .onCreditLineCreated(async function (event, ctx) {
    creditLineTemplate.bind({
      address: event.args.creditLine,
      startBlock: ctx.blockNumber
    })
  })

// batch handle Tranched Pools
for (let i = 0; i < goldfinchPools.data.length; i++) {
  const tranchedPool = goldfinchPools.data[i];

  // console.log(tranchedPool)

  const handler = async function(_:any, ctx: CreditLineContext) {
    const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n**6n)

    ctx.meter.Histogram('tranchedPool_balance').record(loanBalance, {"idx" : String(i)})
  }

  CreditLineProcessor.bind({address: tranchedPool.creditLineAddress, startBlock:tranchedPool.creditLineStartBlock })
    .onBlock(handler)
}