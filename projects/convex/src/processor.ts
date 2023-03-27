import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {StETHRewardProcessor, StETHRewardContext} from './types/eth/stethreward.js'
import {DepositProcessor, DepositContext} from './types/eth/deposit.js'

DepositProcessor.bind({address: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31"})
    .onEventDeposited(async (evt, ctx)=>{
        const poolID = evt.args.poolid
        const poolInfo = await ctx.contract.poolInfo(poolID)
        ctx.eventLogger.emit("deposit", {
            distinctId: evt.args.user,
            token: poolInfo.token,
            lpToken: poolInfo.lptoken,
            amount: evt.args.amount,
        })
    })
    .onEventWithdrawn(async (evt, ctx)=>{
        const poolID = evt.args.poolid
        const poolInfo = await ctx.contract.poolInfo(poolID)
        ctx.eventLogger.emit("withdraw", {
            distinctId: evt.args.user,
            token: poolInfo.token,
            lpToken: poolInfo.lptoken,
            amount: evt.args.amount,
        })
    })

StETHRewardProcessor.bind({address: "0x0A760466E1B4621579a82a39CB56Dda2F4E70f03"})
    .onEventRewardPaid(async (evt, ctx)=>{
        ctx.eventLogger.emit("reward", {
            distinctId: evt.args.user,
            amount: evt.args.reward,
        })
    })


