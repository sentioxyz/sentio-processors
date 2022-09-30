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
  PaymentAppliedEvent,
  DrawdownMadeEvent as TranchedDrawdownMadeEvent,
  TrancheLockedEvent,
  getTranchedPoolContract
} from './types/tranchedpool';
import { CreditLineContext, CreditLineProcessor, CreditLineProcessorTemplate, getCreditLineContract } from './types/creditline'
import { getGoldfinchConfigContract } from './types/goldfinchconfig';
import * as goldfinchPools from "./goldfinchPools.json"
import { GoldfinchFactoryProcessor } from "./types/goldfinchfactory";
import { CreditDeskContext, CreditDeskProcessor, DrawdownMadeEvent } from "./types/creditdesk";
import { TranchedPoolContext, TranchedPoolProcessor } from './types/tranchedpool';
import { toBigDecimal } from "@sentio/sdk/lib/utils"
import { BigDecimal } from '@sentio/sdk'
import type { BigNumber } from 'ethers'
import type { Block } from '@ethersproject/providers'
import  { BigNumber as BN } from 'ethers'

import { GF_CONFIG_ADDR, INTEREST_FROM_SENIOR_TO_JUNIOR } from './constant'
import { DAYS_PER_YEAR, isPaymentLate, isPaymentLateForGracePeriod, SECONDS_PER_DAY } from './helpers';
/*
TODO: known discrepancies from dune implenetation:
1) TranchedPool is stored in MigratedTranchedPool tables on dune
2) There are only 15 address in MigratedTranchedPool tables while we got 23
3) Pool table is currently not implmeneted in this processor, the contract address is stored in POOL_ADD but there is no ABI on etherscan and seems obsolete
4) TranchedPool table is empty on dune
*/
const startBlock = 13096883
const decimal = 6

const SAMPLE_RATE = 1000
const SAMPLE_START = 14096883

function scaleDown(amount: BigNumber, decimal: number) {
  return toBigDecimal(amount).div(BigDecimal(10).pow(decimal))
}

// used for certain metrics that don't change that often
// e.g. config related stuff
function shouldSample(blockNumber: number, sampleRate: number = SAMPLE_RATE, sampleStart: number = SAMPLE_START) {
  return (blockNumber < sampleStart) || (blockNumber % sampleRate == 0)
}

//only creditline contracts after this block has newer ABI such as isLate
const block_for_newer_creditline = 14143568

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


/*
SELECT
"evt_block_time" AS ts
, "capitalProvider" AS user
, 'deposit' AS type
, amount
FROM goldfinch."Pool_evt_DepositMade"

UNION ALL SELECT
"evt_block_time" AS ts
, "capitalProvider" AS user
, 'deposit' AS type
, amount
FROM goldfinch."SeniorPool_evt_DepositMade"

UNION ALL SELECT
"evt_block_time" AS ts
, "owner" AS user
, 'deposit' AS type
, amount
FROM goldfinch."MigratedTranchedPool_evt_DepositMade"
*/

//MigratedTranchedPool_evt_DepositMade
const tranchedDepositEventHandler = async function(event: TranchedDepositMadeEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('deposit').record(amount)
  ctx.meter.Counter('deposit_acc').add(amount)
}

//SeniorPool_evt_DepositMade
const seniorDepositEventHandler = async function(event: DepositMadeEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('deposit').record(amount)
  ctx.meter.Counter('deposit_acc').add(amount)
}

/*
 -- WITHDRAWS
  UNION ALL SELECT
    "evt_block_time" AS ts
  , "capitalProvider" AS user
  , 'withdrawal' AS type
  , "userAmount" + "reserveAmount" AS amount
  FROM goldfinch."Pool_evt_WithdrawalMade"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "capitalProvider" AS user
  , 'withdrawal' AS type
  , "userAmount" + "reserveAmount" AS amount
  FROM goldfinch."SeniorPool_evt_WithdrawalMade"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "owner" AS user
  , 'withdrawal' AS type
  , "interestWithdrawn" + "principalWithdrawn" AS amount
  FROM goldfinch."MigratedTranchedPool_evt_WithdrawalMade"
*/

//MigratedTranchedPool_evt_WithdrawalMade
const tranchedWithdrawEventHandler = async function(event: TranchedWithdrawalMadeEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.interestWithdrawn.add(event.args.principalWithdrawn)).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('withdraw').record(amount)
  ctx.meter.Counter('withdraw_acc').add(amount)
}

//SeniorPool_evt_WithdrawalMade
const seniorWithdrawEventHandler = async function(event: WithdrawalMadeEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.userAmount.add(event.args.reserveAmount)).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('withdraw').record(amount)
  ctx.meter.Counter('withdraw_acc').add(amount)
}

/*
-- DRAWDOWNS
UNION ALL SELECT
 "evt_block_time" AS ts
, "borrower" AS user
, 'drawdown' AS type
, "drawdownAmount" AS amount
FROM goldfinch."CreditDesk_evt_DrawdownMade"

UNION ALL SELECT
 "evt_block_time" AS ts
, "borrower" AS user
, 'drawdown' AS type
, amount
FROM goldfinch."MigratedTranchedPool_evt_DrawdownMade"
*/
const drawDownMadeHandler = async function(event: DrawdownMadeEvent, ctx: CreditDeskContext) {
  const amount = toBigDecimal(event.args.drawdownAmount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('drowdown').record(amount)
  ctx.meter.Counter('drawdown_acc').add(amount)
}

const tranchedDrawDownMadeHandler = async function(event: TranchedDrawdownMadeEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('drowdown').record(amount)
  ctx.meter.Counter('drawdown_acc').add(amount)
}
/*
--SENIOR POOL NET ALLOCATIONS TO BORROWER POOL
  UNION ALL SELECT
   "evt_block_time" AS ts
  , "tranchedPool" AS user
  , 'allocation' AS type
  , amount
  FROM goldfinch."SeniorPool_evt_InvestmentMadeInSenior"
  
  UNION ALL SELECT
   "evt_block_time" AS ts
  , "tranchedPool" AS user
  , 'allocation' AS type
  , amount
  FROM goldfinch."SeniorPool_evt_InvestmentMadeInJunior"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'allocation' AS type
  , -amount
  FROM goldfinch."SeniorPool_evt_InterestCollected"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'allocation' AS type
  , -amount
  FROM goldfinch."SeniorPool_evt_PrincipalCollected"
*/

//SeniorPool_evt_InvestmentMadeInSenior
const investmentMadeInSeniorEventHandler = async function(event: InvestmentMadeInSeniorEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//SeniorPool_evt_InvestmentMadeInJunior
const investmentMadeInJuniorEventHandler = async function(event: InvestmentMadeInJuniorEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//SeniorPool_evt_InterestCollected, note the minus sign
const interestCollectedEventHandler = async function(event: InterestCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  // note as allocation it is negative according to https://dune.com/queries/15148/30399
  ctx.meter.Gauge('allocation').record(-amount)
  ctx.meter.Counter('allocation_acc').sub(amount)
}

//SeniorPool_evt_PrincipalCollected, note the minus sign
const principalCollectedEventHandler = async function(event: PrincipalCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  // note as allocation it is negative according to https://dune.com/queries/15148/30399
  ctx.meter.Gauge('allocation').record(-amount)
  ctx.meter.Counter('allocation_acc').sub(amount)
}
/*
  -- INTEREST
  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'interest' AS type
  , "poolAmount" AS amount
  FROM goldfinch."Pool_evt_InterestCollected"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'interest' AS type
  , "interestAmount" - "reserveAmount" AS amount
  FROM goldfinch."MigratedTranchedPool_evt_PaymentApplied"

    -- PRINCIPAL
  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'principal' AS type
  , amount
  FROM goldfinch."Pool_evt_PrincipalCollected"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "payer" AS user
  , 'principal' AS type
  , "principalAmount" AS amount
  FROM goldfinch."MigratedTranchedPool_evt_PaymentApplied"
*/

//MigratedTranchedPool_evt_PaymentApplied
const PaymentAppliedEventHandler = async function(event: PaymentAppliedEvent, ctx: TranchedPoolContext) {
  //interest - reserve: https://dune.com/queries/15148/30399
  const interestAmount = toBigDecimal(event.args.interestAmount.sub(event.args.reserveAmount)).div(BigDecimal(10).pow(decimal))
  const principalAmount = toBigDecimal(event.args.principalAmount).div(BigDecimal(10).pow(decimal))
  // used in V2 for the following request:
  //   total interest paid
  // Loop through all PaymentApplied events
  //   total principal paid
  // Loop through all PaymentApplied events (and look at the principal paid back)
  ctx.meter.Gauge('interest').record(interestAmount)
  ctx.meter.Counter('interest_acc').add(interestAmount)
  ctx.meter.Gauge('principle').record(principalAmount)
  ctx.meter.Counter('principle_acc').add(principalAmount)
  ctx.meter.Gauge("payment_applied").record(1)
  ctx.meter.Counter("payment_applied_count").add(1)

  //determine if payment is late, used in V2
  const paymentTime = BN.from((await ctx.contract.provider.getBlock(event.blockNumber)).timestamp)
  // 5 is the index for LatenessGracePeriodInDays see https://github.com/goldfinch-eng/mono/blob/7d8721246dfdc925512f1dd44c653707d62158ff/packages/protocol/contracts/protocol/core/ConfigOptions.sol#L23
  const creditLine = await getTranchedPoolContract(event.address).creditLine({blockTag: event.blockNumber - 1})
  const graceLateness = (await getGoldfinchConfigContract(GF_CONFIG_ADDR).getNumber(5, {blockTag: event.blockNumber - 1})) as BigNumber
  const nextDueTime = (await getCreditLineContract(creditLine).nextDueTime({blockTag: event.blockNumber - 1}))
  const balance = (await getCreditLineContract(creditLine).balance({blockTag: event.blockNumber - 1}))
  const isLate = isPaymentLate(paymentTime, nextDueTime, balance)
  const isLateForGracePeriod = isPaymentLateForGracePeriod(paymentTime, nextDueTime, graceLateness, balance)

  // const isPaymentLate = await getCreditLineContract(event.address).isLate({blockTag: event.blockNumber - 1})
  // const isPaymentWithinGracePeriod = await getCreditLineContract(event.address).withinPrincipalGracePeriod({blockTag: event.blockNumber - 1})

  if (isLate) {
    ctx.meter.Gauge("payment_late").record(1)
    ctx.meter.Counter("payment_late_count").add(1)
  } else {
    ctx.meter.Gauge("payment_late").record(0)
  }
  if (isLateForGracePeriod) {
    ctx.meter.Gauge("payment_late_grace_period").record(1)
    ctx.meter.Counter("payment_late_grace_period_count").add(1)
  } else {
    ctx.meter.Gauge("payment_late_grace_period").record(0)
  }
}

//TODO: ignoring WRITEDOWN for now because it is 0

/*
  -- REVENUE
  UNION ALL SELECT
    "evt_block_time" AS ts
  , "contract_address" AS user
  , 'revenue' AS type
  , amount
  FROM goldfinch."Pool_evt_ReserveFundsCollected"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "contract_address" AS user
  , 'revenue' AS type
  , amount
  FROM goldfinch."SeniorPool_evt_ReserveFundsCollected"

  UNION ALL SELECT
    "evt_block_time" AS ts
  , "contract_address" AS user
  , 'revenue' AS type
  , amount
  FROM goldfinch."MigratedTranchedPool_evt_ReserveFundsCollected"
)
*/

//SeniorPool_evt_ReserveFundsCollected
const seniorFundsCollectedEventHandler = async function(event: ReserveFundsCollectedEvent, ctx: SeniorPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

//MigratedTranchedPool_evt_ReserveFundsCollected
const tranchedFundsCollectedEventHandler = async function(event: TranchedReserveFundsCollectedEvent, ctx: TranchedPoolContext) {
  const amount = toBigDecimal(event.args.amount).div(BigDecimal(10).pow(decimal))
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

async function creditlineHandler (block: Block, ctx: CreditLineContext) {
  // console.log("start" +  ctx.contract._underlineContract.address)
  const loanBalance = scaleDown(await ctx.contract.balance(), 6)
  ctx.meter.Gauge('tranchedPool_balance').record(loanBalance)

  // if (!shouldSample(block.number)) {
  //   return
  // }

  // added in V2 for
  //   next payment due	
  //   CreditLine.nextDueTime

  const nextDueTime = toBigDecimal(await ctx.contract.nextDueTime())
  ctx.meter.Gauge('tranchedPool_nextdue').record(nextDueTime)

   // V2 request:
  //   Full repayment schedule by month (ie. Expected amount of cash to be paid back in Jan, Feb, March, April, etc. for every month from now until loan maturity)
  // Requires manual calculation, but involves using creditLine.paymentPeriodInDays (eg. if 30, then payments are made every 30 days) and creditLine.nextDueTime (tells you exact time of next expected payment). 
  const interestApr = scaleDown(await ctx.contract.interestApr(), 18)
  const termEnd = toBigDecimal(await ctx.contract.termEndTime())
  const paymentPeriod = toBigDecimal(await ctx.contract.paymentPeriodInDays())
try {
  if (!paymentPeriod.eq(0)) {
    //TODO: need to take the ceil of numOfTerms
    const numOfTerms = termEnd.minus(nextDueTime).div(paymentPeriod.multipliedBy(SECONDS_PER_DAY)).integerValue(BigDecimal.ROUND_CEIL)
    // the interest rate per term
    const termInterest = interestApr.multipliedBy(paymentPeriod).div(DAYS_PER_YEAR)
    // calculate the "mortgage" of the loan assuming each payment is equal using
    // balance * i * (1 + i)^n/[(1 + i)^n - 1]
    // where i is the term interest, n is the number of terms
    const termPayment = loanBalance.multipliedBy(termInterest)
    .multipliedBy(termInterest.plus(1).pow(numOfTerms))
    .dividedBy(termInterest.plus(1).pow(numOfTerms).minus(1))

    ctx.meter.Gauge('tranchedPool_payment').record(termPayment)
  }
} catch(e) {
  throw e
}

}
async function tranchedPoolHandler(block: Block, ctx: TranchedPoolContext) {
  // if (!shouldSample(block.number)) {
  //   return
  // }
  // V2:
  //Junior / Senior Split
  // FConfig.Leverage Ratio
  const leverageRatio = toBigDecimal((await getGoldfinchConfigContract(GF_CONFIG_ADDR).getNumber(9, {blockTag: block.number})) as BigNumber).div(BigDecimal(10).pow(18))
  ctx.meter.Gauge('leverage_ratio').record(leverageRatio)

  //V2:
  // Yield profile for said pool
  // Senior expected yield
  // Requires calculation: Interest rate * 0.7 (10% fee + 20% fee to Backers)
  // Junior expected yield
  // Requires calculation. Interest rate * amount of principal + 20% of seniors portion of interest
  const creditLine = await ctx.contract.creditLine()
  const juniorBalance = await ctx.contract.totalJuniorDeposits()
  const totalDeployed = await ctx.contract.totalDeployed()
  if (!totalDeployed.eq(0)) {
    const seniorBalance = totalDeployed.sub(juniorBalance)
    const seniorPortion = toBigDecimal(seniorBalance).div(toBigDecimal(totalDeployed))

    const interestApr = scaleDown(await getCreditLineContract(creditLine).interestApr(), 18)

    ctx.meter.Gauge('senior_apr').record(interestApr.multipliedBy(0.7))
    // junior apr = apr * (1 - senior_portion + 0.2 * senior_portion) / ( 1 - senior_portion )= apr * (1 - 0.8 * senior_portion) / (1 - senior_portion)
    const juniorApr = interestApr.multipliedBy((new BigDecimal(1)).minus(seniorPortion.multipliedBy(0.8))).div((new BigDecimal(1)).minus(seniorPortion))
    ctx.meter.Gauge('junior_apr').record(juniorApr)
  } else {
    ctx.meter.Gauge('senior_apr').record(0)
    ctx.meter.Gauge('junior_apr').record(0)
  }
 }

const creditLineTemplate = new CreditLineProcessorTemplate()
    .onBlock(creditlineHandler)

// add TODO push contract level label
GoldfinchFactoryProcessor.bind({address: "0xd20508E1E971b80EE172c73517905bfFfcBD87f9", startBlock: 11370655})
  .onEventCreditLineCreated(async function (event, ctx) {
    creditLineTemplate.bind({
      address: event.args.creditLine,
      startBlock: ctx.blockNumber
    })
  })

CreditDeskProcessor.bind({address: "0xb2Bea2610FEEfA4868C3e094D2E44b113b6D6138", startBlock: 11370659})
  .onEventCreditLineCreated(async function (event, ctx) {
    creditLineTemplate.bind({
      address: event.args.creditLine,
      startBlock: ctx.blockNumber
    })
  }).onEventDrawdownMade(drawDownMadeHandler)

// additional events for V2 request
const trancheLockedEventHandler = async function(event:TrancheLockedEvent, ctx: TranchedPoolContext) {
  const trancheId = event.args.trancheId
  if (trancheId.eq(1)) {
    // for V2 request:
    //     next payment due	
    // CreditLine.nextDueTime
    const ts = BN.from((await ctx.contract.provider.getBlock(event.blockNumber)).timestamp)
    // TODO: temp workaround, use counter so we can preserve the value for bar gauge
    ctx.meter.Counter("pool_funded").add(ts)
  }
}

//senior pool processor
// TODO comment out for testing V2 stuff only 
// SeniorPoolProcessor.bind({address: seniorPoolAddress, startBlock: startBlock})
//   .onBlock(seniorPoolHandler)
//   .onEventDepositMade(seniorDepositEventHandler)
//   .onEventWithdrawalMade(seniorWithdrawEventHandler)
//   .onEventReserveFundsCollected(seniorFundsCollectedEventHandler)
//   .onEventInvestmentMadeInSenior(investmentMadeInSeniorEventHandler)
//   .onEventInvestmentMadeInJunior(investmentMadeInJuniorEventHandler)
//   .onEventInterestCollected(interestCollectedEventHandler)
//   .onEventPrincipalCollected(principalCollectedEventHandler)

// batch handle Tranched Pools
// for (let i = 0; i < goldfinchPools.data.length; i++) {
// TODO: only testing out newer pools
for (let i = 0; i < 7; i++) {

  const tranchedPool = goldfinchPools.data[i];
  if (!tranchedPool.auto) {
    CreditLineProcessor.bind({address: tranchedPool.creditLineAddress, startBlock: tranchedPool.creditLineStartBlock})
        .onBlock(creditlineHandler)
  }
  // TODO commented to test V2 stuff only
  // TranchedPoolProcessor.bind({address: tranchedPool.poolAddress, startBlock: tranchedPool.poolStartBlock})
  // .onEventDepositMade(tranchedDepositEventHandler)
  // .onEventWithdrawalMade(tranchedWithdrawEventHandler)
  // .onEventReserveFundsCollected(tranchedFundsCollectedEventHandler)
  // .onEventPaymentApplied(PaymentAppliedEventHandler)
  // .onEventDrawdownMade(tranchedDrawDownMadeHandler)
  // .onEventTrancheLocked(trancheLockedEventHandler)

  TranchedPoolProcessor.bind({address: tranchedPool.poolAddress, startBlock: tranchedPool.poolStartBlock})
  .onBlock(tranchedPoolHandler)
  .onEventPaymentApplied(PaymentAppliedEventHandler)
  .onEventTrancheLocked(trancheLockedEventHandler)
}

