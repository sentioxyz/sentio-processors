import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { FountainProcessor, WithdrawEarlyEvent, ClaimVaultPenaltyEvent, FountainContext } from './types/eth/fountain.js'
import { ReservoirProcessor } from './types/eth/reservoir.js'
import { VenostormProcessor } from './types/eth/venostorm.js'

const DepositEventHandler = async (event: any, ctx: any) => {
  const user = event.args.user
  const pid = Number(event.args.pid)
  const amount = Number(event.args.amount) / Math.pow(10, 18)

  ctx.meter.Counter(`deposit_counter`).add(amount, {
    pid: pid.toString()
  })

  ctx.eventLogger.emit("Deposit", {
    distinctId: user,
    pid,
    amount
  })
}

const WithdrawEventHandler = async (event: any, ctx: any) => {
  const user = event.args.user
  const pid = Number(event.args.pid)
  const amount = Number(event.args.amount) / Math.pow(10, 18)

  ctx.meter.Counter(`withdraw_counter`).add(amount, {
    pid: pid.toString()
  })

  ctx.eventLogger.emit("Withdraw", {
    distinctId: user,
    pid,
    amount
  })
}

const WithdrawEarlyEventHandler = async (event: WithdrawEarlyEvent, ctx: FountainContext) => {
  const user = event.args.user
  const pid = Number(event.args.pid)
  const amount = Number(event.args.amount) / Math.pow(10, 18)

  ctx.meter.Counter(`withdraw_early_counter`).add(amount, {
    pid: pid.toString()
  })

  ctx.eventLogger.emit("WithdrawEarly", {
    distinctId: user,
    pid,
    amount
  })
}

const ClaimVaultPenaltyEventHandler = async (event: ClaimVaultPenaltyEvent, ctx: FountainContext) => {
  const user = event.args.user
  const pendingVaultPenaltyReward = Number(event.args.pendingVaultPenaltyReward) / Math.pow(10, 18)

  ctx.meter.Counter(`penalty_claimed_counter`).add(pendingVaultPenaltyReward)

  ctx.eventLogger.emit("ClaimVaultPenalty", {
    distinctId: user,
    pendingVaultPenaltyReward
  })
}

FountainProcessor.bind({ address: '0xb4be51216f4926ab09ddf4e64bc20f499fd6ca95', network: 25 })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)
  .onEventWithdrawEarly(WithdrawEarlyEventHandler)
  .onEventClaimVaultPenalty(ClaimVaultPenaltyEventHandler)


ReservoirProcessor.bind({ address: '0x21179329c1dcfd36ffe0862cca2c7e85538cca07', network: 25 })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)

VenostormProcessor.bind({ address: '0x579206e4e49581ca8ada619e9e42641f61a84ac3', network: 25 })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)


