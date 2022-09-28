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
import  { BigNumber as BN } from 'ethers'

import { GF_CONFIG_ADDR } from './constant'
import { isPaymentLate, isPaymentLateGracePeriod } from './helpers';
/*
TODO: known discrepancies from dune implenetation:
1) TranchedPool is stored in MigratedTranchedPool tables on dune
2) There are only 15 address in MigratedTranchedPool tables while we got 23
3) Pool table is currently not implmeneted in this processor, the contract address is stored in POOL_ADD but there is no ABI on etherscan and seems obsolete
4) TranchedPool table is empty on dune
*/
const startBlock = 13096883
const decimal = 6

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
  ctx.meter.Counter("payment_count").add(1)

  //determine if payment is late, used in V2
  const paymentTime = BN.from((await ctx.contract.provider.getBlock(event.blockNumber)).timestamp)
  // 5 is the index for LatenessGracePeriodInDays see https://github.com/goldfinch-eng/mono/blob/7d8721246dfdc925512f1dd44c653707d62158ff/packages/protocol/contracts/protocol/core/ConfigOptions.sol#L23
  const creditLine = await getTranchedPoolContract(event.address).creditLine({blockTag: event.blockNumber - 1})
  const graceLateness = (await getGoldfinchConfigContract(GF_CONFIG_ADDR).getNumber(5, {blockTag: event.blockNumber - 1})) as BigNumber
  const nextDueTime = (await getCreditLineContract(creditLine).nextDueTime({blockTag: event.blockNumber - 1}))
  const balance = (await getCreditLineContract(creditLine).balance({blockTag: event.blockNumber - 1}))
  const isLate = isPaymentLate(paymentTime, nextDueTime, balance)
  const isPaymentWithinGracePeriod = isPaymentLateGracePeriod(paymentTime, nextDueTime, graceLateness, balance)

  // const isPaymentLate = await getCreditLineContract(event.address).isLate({blockTag: event.blockNumber - 1})
  // const isPaymentWithinGracePeriod = await getCreditLineContract(event.address).withinPrincipalGracePeriod({blockTag: event.blockNumber - 1})

  if (isLate) {
    ctx.meter.Gauge("payment_late").record(1)
    ctx.meter.Counter("payment_late_count").add(1)
  }
  if (!isPaymentWithinGracePeriod) {
    ctx.meter.Gauge("payment_princile_late").record(1)
    ctx.meter.Counter("payment_princile_late_count").add(1)
  }
  //TODO: no view function provided to get LatenessGracePeriodInDays (instead of principle grace period) 
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

async function creditlineHandler (_: any, ctx: CreditLineContext) {
  // console.log("start" +  ctx.contract._underlineContract.address)
  const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n ** 6n)
  ctx.meter.Gauge('tranchedPool_balance').record(loanBalance)
  
  // added in V2 for
  //   next payment due	
  //   CreditLine.nextDueTime

  const nextDueTime = await ctx.contract.nextDueTime()
  ctx.meter.Gauge('tranchedPool_nextdue').record(nextDueTime)
  // console.log("end" + ctx.contract._underlineContract.address)
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
const trancheLockedEventHandler = function(event:TrancheLockedEvent, ctx: TranchedPoolContext) {
  const trancheId = event.args.trancheId
  if (trancheId.eq(1)) {
    // for V2 request:
    //     next payment due	
    // CreditLine.nextDueTime

    ctx.meter.Gauge("pool_funded").record(1)
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
for (let i = 0; i < 5; i++) {

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
  .onEventPaymentApplied(PaymentAppliedEventHandler)
  .onEventTrancheLocked(trancheLockedEventHandler)
}

