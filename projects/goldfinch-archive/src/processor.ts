import { DepositMadeEvent,
  WithdrawalMadeEvent,
  SeniorPoolContext,
  SeniorPoolProcessor,
  ReserveFundsCollectedEvent,
  InvestmentMadeInSeniorEvent,
  InvestmentMadeInJuniorEvent,
  InterestCollectedEvent,
  PrincipalCollectedEvent
} from './types/eth/seniorpool.js'
import { DepositMadeEvent as TranchedDepositMadeEvent,
  WithdrawalMadeEvent as TranchedWithdrawalMadeEvent,
  ReserveFundsCollectedEvent as TranchedReserveFundsCollectedEvent,
  PaymentAppliedEvent,
  DrawdownMadeEvent as TranchedDrawdownMadeEvent
} from './types/eth/tranchedpool.js';
import { CreditLineContext, CreditLineProcessor, CreditLineProcessorTemplate } from './types/eth/creditline.js'

import { goldfinchPools } from "./goldfinchPools.js"
import { GoldfinchFactoryProcessor } from "./types/eth/goldfinchfactory.js";
import { CreditDeskContext, CreditDeskProcessor, DrawdownMadeEvent } from "./types/eth/creditdesk.js";
import { TranchedPoolContext, TranchedPoolProcessor } from './types/eth/tranchedpool.js';
// import { conversion } from "@sentio/sdk/lib/utils"
// const toBigDecimal = conversion.toBigDecimal

import { BigDecimal } from '@sentio/sdk';
/*
TODO: known discrepancies from dune implenetation:
1) TranchedPool is stored in MigratedTranchedPool tables on dune
2) There are only 15 address in MigratedTranchedPool tables while we got 23
3) Pool table is currently not implmeneted in this processor, the contract address is stored in POOL_ADD but there is no ABI on etherscan and seems obsolete
4) TranchedPool table is empty on dune
*/
const startBlock = 13096883
const decimal = 6

// ETH addresses
const seniorPoolAddress = "0x8481a6ebaf5c7dabc3f7e09e44a89531fd31f822"

const seniorPoolHandler = async function(_:any, ctx: SeniorPoolContext) {
  const p1 = ctx.contract.totalLoansOutstanding().then(v => {
    const totalLoansOutstanding = Number(v / 10n**6n)
    ctx.meter.Gauge('goldfinch_totalLoansOutstanding').record(totalLoansOutstanding)
  })
  const p2 = ctx.contract.sharePrice().then(v => {
    const sharePrice = Number(v / 10n**6n)
    ctx.meter.Gauge('goldfinch_sharePrice').record(sharePrice)
  })
  const p3 = ctx.contract.assets().then(v => {
    const assets = Number(v / 10n**6n)
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
  const amount = event.args.amount.scaleDown(decimal)
  ctx.meter.Gauge('deposit').record(amount)
  ctx.meter.Counter('deposit_acc').add(amount)
}

//SeniorPool_evt_DepositMade
const seniorDepositEventHandler = async function(event: DepositMadeEvent, ctx: SeniorPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
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
  const amount = (event.args.interestWithdrawn + event.args.principalWithdrawn).scaleDown(decimal)
  ctx.meter.Gauge('withdraw').record(amount)
  ctx.meter.Counter('withdraw_acc').add(amount)
}

//SeniorPool_evt_WithdrawalMade
const seniorWithdrawEventHandler = async function(event: WithdrawalMadeEvent, ctx: SeniorPoolContext) {
  event.address
  const amount = (event.args.userAmount + event.args.reserveAmount).scaleDown(decimal)
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
  const amount = event.args.drawdownAmount.scaleDown(decimal)
  ctx.meter.Gauge('drowdown').record(amount)
  ctx.meter.Counter('drawdown_acc').add(amount)
}

const TranchedDrawDownMadeHandler = async function(event: TranchedDrawdownMadeEvent, ctx: TranchedPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
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
  const amount = event.args.amount.scaleDown(decimal)
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//SeniorPool_evt_InvestmentMadeInJunior
const investmentMadeInJuniorEventHandler = async function(event: InvestmentMadeInJuniorEvent, ctx: SeniorPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
  ctx.meter.Gauge('allocation').record(amount)
  ctx.meter.Counter('allocation_acc').add(amount)
}

//SeniorPool_evt_InterestCollected, note the minus sign
const interestCollectedEventHandler = async function(event: InterestCollectedEvent, ctx: SeniorPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
  // note as allocation it is negative according to https://dune.com/queries/15148/30399
  ctx.meter.Gauge('allocation').record(-amount)
  ctx.meter.Counter('allocation_acc').sub(amount)
}

//SeniorPool_evt_PrincipalCollected, note the minus sign
const principalCollectedEventHandler = async function(event: PrincipalCollectedEvent, ctx: SeniorPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
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
  const interestAmount = (event.args.interestAmount - event.args.reserveAmount).scaleDown(decimal)
  const principalAmount = event.args.principalAmount.scaleDown(decimal)
  ctx.meter.Gauge('interest').record(interestAmount)
  ctx.meter.Counter('interest_acc').add(interestAmount)
  ctx.meter.Gauge('principle').record(principalAmount)
  ctx.meter.Counter('principle_acc').add(principalAmount)
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
  const amount = event.args.amount.scaleDown(decimal)
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

//MigratedTranchedPool_evt_ReserveFundsCollected
const tranchedFundsCollectedEventHandler = async function(event: TranchedReserveFundsCollectedEvent, ctx: TranchedPoolContext) {
  const amount = event.args.amount.scaleDown(decimal)
  ctx.meter.Gauge('revenue').record(amount)
  ctx.meter.Counter('revenue_acc').add(amount)
}

async function creditlineHandler (_: any, ctx: CreditLineContext) {
  // console.log("start" +  ctx.contract._underlineContract.address)
  const loanBalance = (await ctx.contract.balance()).scaleDown(6)
  ctx.meter.Gauge('tranchedPool_balance').record(loanBalance)
  // console.log("end" + ctx.contract._underlineContract.address)
}

const creditLineTemplate = new CreditLineProcessorTemplate()
    .onBlockInterval(creditlineHandler)

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

//senior pool processor
SeniorPoolProcessor.bind({address: seniorPoolAddress, startBlock: startBlock})
  .onBlockInterval(seniorPoolHandler)
  .onEventDepositMade(seniorDepositEventHandler)
  .onEventWithdrawalMade(seniorWithdrawEventHandler)
  .onEventReserveFundsCollected(seniorFundsCollectedEventHandler)
  .onEventInvestmentMadeInSenior(investmentMadeInSeniorEventHandler)
  .onEventInvestmentMadeInJunior(investmentMadeInJuniorEventHandler)
  .onEventInterestCollected(interestCollectedEventHandler)
  .onEventPrincipalCollected(principalCollectedEventHandler)

// batch handle Tranched Pools
for (let i = 0; i < goldfinchPools.length; i++) {
  const tranchedPool = goldfinchPools[i];
  if (!tranchedPool.auto) {
    CreditLineProcessor.bind({address: tranchedPool.creditLineAddress, startBlock: tranchedPool.creditLineStartBlock})
        .onBlockInterval(creditlineHandler)
  }
  TranchedPoolProcessor.bind({address: tranchedPool.poolAddress, startBlock: tranchedPool.poolStartBlock})
  .onEventDepositMade(tranchedDepositEventHandler)
  .onEventWithdrawalMade(tranchedWithdrawEventHandler)
  .onEventReserveFundsCollected(tranchedFundsCollectedEventHandler)
  .onEventPaymentApplied(PaymentAppliedEventHandler)
  .onEventDrawdownMade(TranchedDrawDownMadeHandler)
}

