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
  const p1 = ctx.contract.totalLoansOutstanding().then(v => {
    const totalLoansOutstanding = Number(v.toBigInt() / 10n**6n)
    ctx.meter.Gauge('goldfinch_totalLoansOutstanding').record(totalLoansOutstanding)
  })
  const p2 = ctx.contract.sharePrice().then(v => {
    const sharePrice = Number(v.toBigInt()/ 10n**6n)
    ctx.meter.Gauge('goldfinch_sharePrice').record(sharePrice)
  })
  const p3 = ctx.contract.assets().then(v => {
    const assets = Number(v.toBigInt() / 10n**6n)
    ctx.meter.Gauge('goldfinch_assets').record(assets)
  })
  return Promise.all([p1, p2, p3])
}

SeniorPoolProcessor.bind({address: seniorPoolAddress, startBlock: startBlock})
  .onBlock(seniorPoolHandler)

async function creditlineHandler (_: any, ctx: CreditLineContext) {
  console.log("start" +  ctx.contract._underlineContract.address)
  const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n ** 6n)
  ctx.meter.Gauge('tranchedPool_balance').record(loanBalance)
  console.log("end" + ctx.contract._underlineContract.address)
}

const creditLineTemplate = new CreditLineProcessorTemplate()
    .onBlock(creditlineHandler)

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
  if (!tranchedPool.auto) {
    CreditLineProcessor.bind({address: tranchedPool.creditLineAddress, startBlock: tranchedPool.creditLineStartBlock})
        .onBlock(creditlineHandler)
  }
}

