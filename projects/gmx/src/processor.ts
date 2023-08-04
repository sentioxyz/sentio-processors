import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { VaultProcessor } from './types/eth/vault.js'
import { GMXProcessor } from './types/eth/gmx.js'
import { GlpManagerProcessor } from './types/eth/glpmanager.js'
import { RewardRouterProcessor } from './types/eth/rewardrouter.js'
import { RewardTrackerProcessor, RewardTrackerContext } from './types/eth/rewardtracker.js'
import { EthChainId } from "@sentio/sdk/eth";
import { gaugeTokenAum, gaugeStakedAssets } from './helper/gmx-helper.js';
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { GMX_ADDRESS, REWARD_ROUTER, VAULT_ADDRESS, esGMX_ADDRESS, sGMX_ADDRESS, GLP_MANAGER_ADDRESS, vGLP_ADDRESS, vGMX_ADDRESS, REWARD_TRACKER_ADDRESS } from './helper/constant.js'
import { getOrCreateCoin } from './helper/gmx-helper.js'

VaultProcessor.bind({ address: VAULT_ADDRESS, network: EthChainId.ARBITRUM })
    .onEventIncreasePosition(async (evt, ctx) => {
        const collateral = await getOrCreateCoin(ctx, evt.args.collateralToken.toLowerCase())
        const collateralDelta = Number(evt.args.collateralDelta) / Math.pow(10, 30)
        const token = evt.args.indexToken
        const sizeDelta = Number(evt.args.sizeDelta) / Math.pow(10, 30)
        ctx.eventLogger.emit("vault.increasePosition", {
            distinctId: evt.args.account,
            collateralToken: collateral.symbol,
            coin_symbol: collateral.symbol,
            collateralDelta: collateralDelta,
            token,
            sizeDelta,
            isLong: evt.args.isLong,
        })
    })
    .onEventDecreasePosition(async (evt, ctx) => {
        const collateral = await getOrCreateCoin(ctx, evt.args.collateralToken.toLowerCase())
        const collateralDelta = Number(evt.args.collateralDelta) / Math.pow(10, 30)
        const token = evt.args.indexToken
        const sizeDelta = Number(evt.args.sizeDelta) / Math.pow(10, 30)
        ctx.eventLogger.emit("vault.decreasePosition", {
            distinctId: evt.args.account,
            collateralToken: collateral.symbol,
            coin_symbol: collateral.symbol,
            collateralDelta: collateralDelta,
            token,
            sizeDelta,
            isLong: evt.args.isLong,
        })
    })
    .onEventSwap(async (evt, ctx) => {
        const tokenIn = await getOrCreateCoin(ctx, evt.args.tokenIn.toLowerCase())
        const tokenOut = await getOrCreateCoin(ctx, evt.args.tokenOut.toLowerCase())
        ctx.eventLogger.emit("vault.swap", {
            distinctId: evt.args.account,
            tokenIn: tokenIn.symbol,
            coin_symbol: tokenIn.symbol,
            tokenOut: tokenOut.symbol,
            amountIn: Number(evt.args.amountIn) / Math.pow(10, tokenIn.decimal),
            amountOut: Number(evt.args.amountOut) / Math.pow(10, tokenOut.decimal)
        })
    })
    // .onEventDirectPoolDeposit(async (evt, ctx) => {
    //     ctx.eventLogger.emit("vault.directPoolDeposit", {
    //         token: evt.args.token,
    //         amount: evt.args.amount,
    //     })
    // })
    .onEventLiquidatePosition(async (evt, ctx) => {
        const collateral = await getOrCreateCoin(ctx, evt.args.collateralToken.toLowerCase())
        ctx.eventLogger.emit("vault.liquidatePostion", {
            distinctId: evt.args.account,
            collateralToken: collateral.symbol,
            coin_symbol: collateral.symbol,
            isLong: evt.args.isLong,
            size: Number(evt.args.size) / Math.pow(10, 30),
            collateral: Number(evt.args.collateral) / Math.pow(10, 30)
        })
    })
    .onEventClosePosition(async (evt, ctx) => {
        let from = ""
        try {
            const tx = (await ctx.contract.provider.getTransaction(ctx.transactionHash!))!
            from = tx.from
        }
        catch (e) { console.log(`get tx from error at ${ctx.transactionHash}`) }

        ctx.eventLogger.emit("vault.closePostion", {
            distinctId: from,
            key: evt.args.key,
            size: Number(evt.args.size) / 10 ** 30,
            collateral: Number(evt.args.collateral) / 10 ** 30,
            averagePrice: evt.args.averagePrice,
            entryFundingRate: evt.args.entryFundingRate,
            reserveAmount: evt.args.reserveAmount,
            realisedPnl: Number(evt.args.realisedPnl) / 10 ** 30
        })
    })
    .onEventCollectMarginFees(async (evt, ctx) => {
        //todo: check decimal of other tokens
        const token = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
        ctx.eventLogger.emit("vault.collectMarginFees", {
            token: token.symbol,
            feeUsd: Number(evt.args.feeUsd) / Math.pow(10, 30),
            feeTokens: evt.args.feeTokens
        })
    })
    .onEventCollectSwapFees(async (evt, ctx) => {
        //todo: check decimal of other tokens
        const token = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
        ctx.eventLogger.emit("vault.collectSwapFees", {
            token: token.symbol,
            feeUsd: Number(evt.args.feeUsd) / Math.pow(10, token.decimal),
            feeTokens: evt.args.feeTokens
        })
    })
    .onTimeInterval(gaugeTokenAum, 240, 240)


RewardTrackerProcessor.bind({ address: REWARD_TRACKER_ADDRESS, network: EthChainId.ARBITRUM })
    .onBlockInterval(async (block, ctx) => {
        const total = await ctx.contract.totalSupply()
        ctx.meter.Gauge("reward_totalSupply").record(total.scaleDown(18))
    }, 1000, 10000)

GMXProcessor.bind({ address: GMX_ADDRESS, network: EthChainId.ARBITRUM })
    .onBlockInterval(async (block, ctx) => {
        const total = await ctx.contract.totalSupply()
        ctx.meter.Gauge("gmx_totalSupply").record(total.scaleDown(18))
    }, 1000, 10000)
    .onTimeInterval(gaugeStakedAssets, 240, 240)

GlpManagerProcessor.bind({ address: GLP_MANAGER_ADDRESS, network: EthChainId.ARBITRUM })
    .onEventAddLiquidity(async (evt, ctx) => {
        const collateral = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
        ctx.eventLogger.emit("glpManager.addLiquidity", {
            distinctId: evt.args.account,
            token: collateral.symbol,
            coin_symbol: collateral.symbol,
            amount: Number(evt.args.amount) / Math.pow(10, collateral.decimal),
            mintAmount: Number(evt.args.mintAmount) / Math.pow(10, 18)
        })
    })
    .onEventRemoveLiquidity(async (evt, ctx) => {
        const collateral = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
        ctx.eventLogger.emit("glpManager.removeLiquidity", {
            distinctId: evt.args.account,
            token: collateral.symbol,
            coin_symbol: collateral.symbol,
            glpAmount: Number(evt.args.glpAmount) / Math.pow(10, 18),
            amountOut: Number(evt.args.amountOut) / Math.pow(10, collateral.decimal)
        })
    })
    .onTimeInterval(async (_, ctx) => {
        //record aum of pool assets
        try {
            const aum = Number(await ctx.contract.getAum(true, { blockTag: ctx.blockNumber })) / Math.pow(10, 18)
            ctx.meter.Gauge("aum_pool").record(aum)
        } catch (e) { console.log(`error 1 ${ctx.timestamp}`) }
    }, 240, 240)

//GMX GLP stake
RewardRouterProcessor.bind({ address: REWARD_ROUTER, network: EthChainId.ARBITRUM })
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
        if (evt.args.token.toLowerCase() == GMX_ADDRESS) {
            ctx.eventLogger.emit("rewardRouter.stakeGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
        //token==esGMX
        else if (evt.args.token.toLowerCase() == esGMX_ADDRESS) {
            ctx.eventLogger.emit("rewardRouter.stakeEsGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
    })
    .onEventUnstakeGmx(async (evt, ctx) => {
        //token==GMX
        if (evt.args.token.toLowerCase() == GMX_ADDRESS) {
            ctx.eventLogger.emit("rewardRouter.unstakeGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
        //token==esGMX
        else if (evt.args.token.toLowerCase() == esGMX_ADDRESS) {
            ctx.eventLogger.emit("rewardRouter.unstakeEsGmx", {
                distinctId: evt.args.account,
                amount: Number(evt.args.amount) / Math.pow(10, 18)
            })
        }
    })