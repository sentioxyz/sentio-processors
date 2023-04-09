import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { VaultProcessor, VaultContext } from './types/eth/vault.js'
import {GMXProcessor, GMXContext} from './types/eth/gmx.js'
import {RewardTrackerProcessor, RewardTrackerContext} from './types/eth/rewardtracker.js'
import {CHAIN_IDS} from "@sentio/sdk";

VaultProcessor.bind({address: "0x489ee077994B6658eAfA855C308275EAd8097C4A", network: CHAIN_IDS.ARBITRUM})
.onEventIncreasePosition(async (evt, ctx)=>{
    const collateral = evt.args.collateralToken
    const collateralAmount = evt.args.collateralDelta
    const token = evt.args.indexToken
    const tokenAmount = evt.args.sizeDelta
    ctx.eventLogger.emit("vault.increasePosition", {
        distinctId: evt.args.account,
        collateral : collateral,
        collateralAmount : collateralAmount,
        token: token,
        tokenAmount: tokenAmount,
        isLong: evt.args.isLong,
    })
})
.onEventDecreasePosition(async (evt, ctx)=>{
    const collateral = evt.args.collateralToken
    const collateralAmount = evt.args.collateralDelta
    const token = evt.args.indexToken
    const tokenAmount = evt.args.sizeDelta
    ctx.eventLogger.emit("vault.decreasePosition", {
        distinctId: evt.args.account,
        collateral : collateral,
        collateralAmount : collateralAmount,
        token: token,
        tokenAmount: tokenAmount,
        isLong: evt.args.isLong,
    })
})
.onEventSwap(async (evt, ctx)=>{
    ctx.eventLogger.emit("vault.swap", {
        distinctId: evt.args.account,
        tokenIn: evt.args.tokenIn,
        tokenOut: evt.args.tokenOut,
        amountIn: evt.args.amountIn,
        amountOut: evt.args.amountOut,
    })
})
.onEventDirectPoolDeposit(async (evt, ctx)=>{
    ctx.eventLogger.emit("vault.directPoolDeposit", {
        token: evt.args.token,
        amount: evt.args.amount,
    })
})

RewardTrackerProcessor.bind({address: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F", network: CHAIN_IDS.ARBITRUM})
.onBlockInterval(async (block, ctx)=>{
    const total = await ctx.contract.totalSupply()
    ctx.meter.Gauge("reward_totalSupply").record(total.scaleDown(18))
}, 1000, 10000)

GMXProcessor.bind({address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", network: CHAIN_IDS.ARBITRUM})
.onBlockInterval(async (block, ctx)=>{
    const total = await ctx.contract.totalSupply()
    ctx.meter.Gauge("gmx_totalSupply").record(total.scaleDown(18))
}, 1000, 10000)
