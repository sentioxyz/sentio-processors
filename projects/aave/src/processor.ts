import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {PoolContext, PoolProcessor} from './types/eth/pool.js'

PoolProcessor.bind({address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"})
.onEventSupply(async (evt, ctx)=>{
    ctx.meter.Counter("supply_counter").add(1)
    ctx.eventLogger.emit("supply", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
    })
}).onEventWithdraw(async (evt, ctx)=>{
    ctx.meter.Counter("withdraw_counter").add(1)
    // emit event log
    ctx.eventLogger.emit("withdraw", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
        to: evt.args.to,
    })
}).onEventBorrow(async (evt, ctx)=>{
    ctx.meter.Counter("borrow_counter").add(1)
    // emit event log
    ctx.eventLogger.emit("borrow", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
        interestRateMode: evt.args.interestRateMode,
        referralCode: evt.args.referralCode,
        borrowRate: evt.args.borrowRate,
    })
}).onEventRepay(async (evt, ctx)=>{
    ctx.meter.Counter("repay_counter").add(1)
    // emit event log
    ctx.eventLogger.emit("repay", {
        distinctId: evt.args.user,
        repayer: evt.args.repayer,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
        useAToken: evt.args.useATokens,
    })
}).onEventFlashLoan(async (evt, ctx)=>{
    ctx.meter.Counter("flashloan_counter").add(1)
    // emit event log like before
    ctx.eventLogger.emit("flashloan", {
        distinctId: evt.args.initiator,
        amount: evt.args.amount,
        reserve: evt.args.asset,
        interestRateMode: evt.args.interestRateMode,
        premium: evt.args.premium,
        referralCode: evt.args.referralCode,
        target: evt.args.target,
    })
})