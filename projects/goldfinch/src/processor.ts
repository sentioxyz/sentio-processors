import { DepositMadeEvent, 
  WithdrawalMadeEvent, 
  SeniorPoolContext, 
  SeniorPoolProcessor, 
  ReserveFundsCollectedEvent, 
  InvestmentMadeInSeniorEvent,
  InvestmentMadeInJuniorEvent,
  InterestCollectedEvent,
  PrincipalCollectedEvent
} from './types/seniorpool'
import { DepositMadeEvent as TranchedDepositMadeEvent, 
  WithdrawalMadeEvent as TranchedWithdrawalMadeEvent, 
  ReserveFundsCollectedEvent as TranchedReserveFundsCollectedEvent,
  PaymentAppliedEvent
} from './types/tranchedpool';
import { CreditLineContext, CreditLineProcessor, CreditLineProcessorTemplate } from './types/creditline'

import * as goldfinchPools from "./goldfinchPools.json"
import { GoldfinchFactoryProcessor } from "./types/goldfinchfactory";
import { CreditDeskContext, CreditDeskProcessor, DrawdownMadeEvent } from "./types/creditdesk";
import { TranchedPoolContext, TranchedPoolProcessor } from './types/tranchedpool';
import { toBigDecimal } from "@sentio/sdk/lib/utils"
import { BigDecimal } from '@sentio/sdk';

const startBlock = 13096883
const decimal = 6

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

//tranched pools event handlers

//DepositMadeEvent
const tranchedDepositEventHandler = async function(event: TranchedDepositMadeEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('deposit_made').record(amount)
  ctx.meter.Counter('deposit_made_acc').add(amount)
}

//WithdrawalMadeEvent
const tranchedWithdrawEventHandler = async function(event: TranchedWithdrawalMadeEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.interestWithdrawn.add(event.args.principalWithdrawn)).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('withdraw_made').record(amount)
  ctx.meter.Counter('withdraw_made_acc').add(amount)
}

//FundsCollectedEvent
const tranchedFundsCollectedEventHandler = async function(event: TranchedReserveFundsCollectedEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

//
const PaymentAppliedEventHandler = async function(event: PaymentAppliedEvent, ctx: TranchedPoolContext) {
  //interest - reserve: https://dune.com/queries/15148/30399
  const interestAmount = toBigDecimal(event.args.interestAmount.sub(event.args.reserveAmount)).div(BigDecimal(10).pow(decimal))
  const principalAmount = toBigDecimal(event.args.principalAmount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('interest').record(interestAmount)
  ctx.meter.Counter('interest_acc').add(interestAmount)
  ctx.meter.Gauge('principle').record(principalAmount)
  ctx.meter.Counter('principle_acc').add(principalAmount)
}

//senior pool event handlers

//DepositMadeEvent
const seniorDepositEventHandler = async function(event: DepositMadeEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('deposit_made').record(amount)
  ctx.meter.Counter('deposit_made_acc').add(amount)
}


//WithdrawalMadeEvent
const seniorWithdrawEventHandler = async function(event: WithdrawalMadeEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.userAmount.add(event.args.reserveAmount)).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('withdraw_made').record(amount)
  ctx.meter.Counter('withdraw_made_acc').add(amount)
}

//FundsCollectedEvent
const seniorFundsCollectedEventHandler = async function(event: ReserveFundsCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

//InvestmentMadeInSeniorEvent
const investmentMadeInSeniorEventHandler = async function(event: InvestmentMadeInSeniorEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//InvestmentMadeInJuniorEvent
const investmentMadeInJuniorEventHandler = async function(event: InvestmentMadeInJuniorEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//InterestCollected
const interestCollectedEventHandler = async function(event: InterestCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  // note as allocation it is negative according to https://dune.com/queries/15148/30399
  ctx.meter.Gauge('allocation').record(-amount)
  ctx.meter.Counter('allocation_acc').sub(amount)
}

//InterestCollected
const principalCollectedEventHandler = async function(event: PrincipalCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  // note as allocation it is negative according to https://dune.com/queries/15148/30399
  ctx.meter.Gauge('allocation').record(-amount)
  ctx.meter.Counter('allocation_acc').sub(amount)
}

const drawDownMadeHandler = async function(event: DrawdownMadeEvent, ctx: CreditDeskContext) {
  const amount = toBigDecimal(event.args.drawdownAmount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('drowdown').record(amount)
  ctx.meter.Counter('drawdown_acc').add(amount)
}

async function creditlineHandler (_: any, ctx: CreditLineContext) {
  // console.log("start" +  ctx.contract._underlineContract.address)
  const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n ** 6n)
  ctx.meter.Gauge('tranchedPool_balance').record(loanBalance)
  // console.log("end" + ctx.contract._underlineContract.address)
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
  }).onDrawdownMade(drawDownMadeHandler)

//senior pool
SeniorPoolProcessor.bind({address: seniorPoolAddress, startBlock: startBlock})
  .onBlock(seniorPoolHandler)
  .onDepositMade(seniorDepositEventHandler)
  .onWithdrawalMade(seniorWithdrawEventHandler)
  .onReserveFundsCollected(seniorFundsCollectedEventHandler)
  .onInvestmentMadeInSenior(investmentMadeInSeniorEventHandler)
  .onInvestmentMadeInJunior(investmentMadeInJuniorEventHandler)
  .onInterestCollected(interestCollectedEventHandler)
  .onPrincipalCollected(principalCollectedEventHandler)

// batch handle Tranched Pools
for (let i = 0; i < goldfinchPools.data.length; i++) {
  const tranchedPool = goldfinchPools.data[i];
  if (!tranchedPool.auto) {
    CreditLineProcessor.bind({address: tranchedPool.creditLineAddress, startBlock: tranchedPool.creditLineStartBlock})
        .onBlock(creditlineHandler)
    TranchedPoolProcessor.bind({address: tranchedPool.poolAddress, startBlock: tranchedPool.poolStartBlock})
    .onDepositMade(tranchedDepositEventHandler)
    .onWithdrawalMade(tranchedWithdrawEventHandler)
    .onReserveFundsCollected(tranchedFundsCollectedEventHandler)
    .onPaymentApplied(PaymentAppliedEventHandler)
  }
}

