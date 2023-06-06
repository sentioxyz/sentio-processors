import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { VaultProcessor } from './types/eth/vault.js'
import { GMXProcessor } from './types/eth/gmx.js'
import { GlpManagerProcessor } from './types/eth/glpmanager.js'
import { RewardRouterProcessor } from './types/eth/rewardrouter.js'
import { RewardTrackerProcessor, RewardTrackerContext } from './types/eth/rewardtracker.js'
import { EthChainId } from "@sentio/sdk/eth";
import { getOrCreateToken } from './helper/gmx-helper.js';
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'

VaultProcessor.bind({ address: "0x489ee077994B6658eAfA855C308275EAd8097C4A", network: EthChainId.ARBITRUM })
    .onEventIncreasePosition(async (evt, ctx) => {
        const collateralTokenInfo = await getOrCreateToken(ctx, evt.args.collateralToken)
        const collateralDelta = Number(evt.args.collateralDelta) / Math.pow(10, collateralTokenInfo.decimal)
        const token = evt.args.indexToken
        const sizeDelta = Number(evt.args.sizeDelta) / Math.pow(10, collateralTokenInfo.decimal)
        ctx.eventLogger.emit("vault.increasePosition", {
            distinctId: evt.args.account,
            collateralToken: collateralTokenInfo.symbol,
            collateralDelta: collateralDelta,
            token,
            sizeDelta,
            isLong: evt.args.isLong,
        })
    })
    .onEventDecreasePosition(async (evt, ctx) => {
        const collateralTokenInfo = await getOrCreateToken(ctx, evt.args.collateralToken)
        const collateralDelta = Number(evt.args.collateralDelta) / Math.pow(10, collateralTokenInfo.decimal)
        const token = evt.args.indexToken
        const sizeDelta = Number(evt.args.sizeDelta) / Math.pow(10, collateralTokenInfo.decimal)
        ctx.eventLogger.emit("vault.decreasePosition", {
            distinctId: evt.args.account,
            collateralToken: collateralTokenInfo.symbol,
            collateralDelta: collateralDelta,
            token,
            sizeDelta,
            isLong: evt.args.isLong,
        })
    })
    .onEventSwap(async (evt, ctx) => {
        ctx.eventLogger.emit("vault.swap", {
            distinctId: evt.args.account,
            tokenIn: evt.args.tokenIn,
            tokenOut: evt.args.tokenOut,
            amountIn: evt.args.amountIn,
            amountOut: evt.args.amountOut,
        })
    })
    .onEventDirectPoolDeposit(async (evt, ctx) => {
        ctx.eventLogger.emit("vault.directPoolDeposit", {
            token: evt.args.token,
            amount: evt.args.amount,
        })
    })
    .onEventLiquidatePosition(async (evt, ctx) => {
        const collateralTokenInfo = await getOrCreateToken(ctx, evt.args.collateralToken)
        ctx.eventLogger.emit("vault.liquidatePostion", {
            distinctId: evt.args.account,
            collateralToken: collateralTokenInfo.symbol,
            isLong: evt.args.isLong,
            size: Number(evt.args.size) / Math.pow(10, collateralTokenInfo.decimal),
            collateral: Number(evt.args.collateral) / Math.pow(10, collateralTokenInfo.decimal)
        })
    })


RewardTrackerProcessor.bind({ address: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F", network: EthChainId.ARBITRUM })
    .onBlockInterval(async (block, ctx) => {
        const total = await ctx.contract.totalSupply()
        ctx.meter.Gauge("reward_totalSupply").record(total.scaleDown(18))
    }, 1000, 10000)

GMXProcessor.bind({ address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", network: EthChainId.ARBITRUM })
    .onBlockInterval(async (block, ctx) => {
        const total = await ctx.contract.totalSupply()
        ctx.meter.Gauge("gmx_totalSupply").record(total.scaleDown(18))
    }, 1000, 10000)

GlpManagerProcessor.bind({ address: "0x3963ffc9dff443c2a94f21b129d429891e32ec18", network: EthChainId.ARBITRUM })
    .onEventAddLiquidity(async (evt, ctx) => {
        const tokenInfo = await getOrCreateToken(ctx, evt.args.token)
        ctx.eventLogger.emit("glpManager.addLiquidity", {
            distinctId: evt.args.account,
            token: tokenInfo.symbol,
            amount: Number(evt.args.amount) / Math.pow(10, tokenInfo.decimal),
            mintAmount: Number(evt.args.mintAmount) / Math.pow(10, 18)
        })
    })
    .onEventRemoveLiquidity(async (evt, ctx) => {
        const tokenInfo = await getOrCreateToken(ctx, evt.args.token)
        ctx.eventLogger.emit("glpManager.removeLiquidity", {
            distinctId: evt.args.account,
            token: tokenInfo.symbol,
            glpAmount: Number(evt.args.glpAmount) / Math.pow(10, tokenInfo.decimal),
            amountOut: Number(evt.args.amountOut) / Math.pow(10, 18)
        })
    })
    .onTimeInterval(async (_, ctx) => {
        //record aum of pool assets
        const aum = Number(await ctx.contract.getAum(true, { blockTag: ctx.blockNumber })) / Math.pow(10, 18)
        ctx.meter.Gauge("aum_pool").record(aum)
        //record sGLP amount
        const stakedGlp = Number(await getERC20ContractOnContext(ctx, "0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf").totalSupply()) / Math.pow(10, 18)
        ctx.meter.Gauge("stakeGlp").record(stakedGlp)
    }, 240, 1440)

//FUL 
RewardRouterProcessor.bind({ address: "0xB95DB5B167D75e6d04227CfFFA61069348d271F5", network: EthChainId.ARBITRUM })
    .onEventStakeGlp(async (evt, ctx) => {
        ctx.eventLogger.emit("rewardRouter.stakeGlp", {
            distinctId: evt.args.account,
            amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
    })
    .onEventUnstakeGlp(async (evt, ctx) => {
        ctx.eventLogger.emit("rewardRouter.unstakeGlp", {
            distinctId: evt.args.account,
            amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
    })
    .onEventStakeGmx(async (evt, ctx) => {
        //token==GMX
        if (evt.args.token.toLowerCase() == "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a") {
            ctx.eventLogger.emit("rewardRouter.stakeGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
        //token==esGMX
        else if (evt.args.token.toLowerCase() == "0xf42ae1d54fd613c9bb14810b0588faaa09a426ca") {
            ctx.eventLogger.emit("rewardRouter.stakeEsGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
    })
    .onEventUnstakeGmx(async (evt, ctx) => {
        //token==GMX
        if (evt.args.token.toLowerCase() == "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a") {
            ctx.eventLogger.emit("rewardRouter.unstakeGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
        //token==esGMX
        else if (evt.args.token.toLowerCase() == "0xf42ae1d54fd613c9bb14810b0588faaa09a426ca") {
            ctx.eventLogger.emit("rewardRouter.unstakeEsGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
    })