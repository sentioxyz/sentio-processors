import { VaultProcessor } from './types/eth/vault.js'
import { FlpManagerProcessor } from './types/eth/flpmanager.js'
import { EthChainId } from "@sentio/sdk/eth";
import { FulProcessor } from './types/eth/ful.js'
import { RewardRouterProcessor } from './types/eth/rewardrouter.js'
import { gaugeTokenAum, gaugeStakedAssets } from './helper/fulcrom-helper.js';
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { WhitelistTokenMap, FUL, sFUL, esFUL, vFLP, vFUL, VAULT, FUL_MANAGER, REWARD_ROUTER } from './helper/constant.js'


VaultProcessor.bind({ address: VAULT, network: EthChainId.CRONOS })
  .onEventIncreasePosition(async (evt, ctx) => {
    const collateral = WhitelistTokenMap[evt.args.collateralToken.toLowerCase()]
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
    const collateral = WhitelistTokenMap[evt.args.collateralToken.toLowerCase()]
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
    const tokenIn = WhitelistTokenMap[evt.args.tokenIn.toLowerCase()]
    const tokenOut = WhitelistTokenMap[evt.args.tokenOut.toLowerCase()]
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
  //   ctx.eventLogger.emit("vault.directPoolDeposit", {
  //     token: evt.args.token,
  //     amount: evt.args.amount,
  //   })
  // })
  .onEventLiquidatePosition(async (evt, ctx) => {
    const collateral = WhitelistTokenMap[evt.args.collateralToken.toLowerCase()]
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
    const token = WhitelistTokenMap[evt.args.token.toLowerCase()]
    ctx.eventLogger.emit("vault.collectMarginFees", {
      token: token.symbol,
      feeUsd: Number(evt.args.feeUsd) / Math.pow(10, 30),
      feeTokens: evt.args.feeTokens
    })
  })
  .onEventCollectSwapFees(async (evt, ctx) => {
    //todo: check decimal of other tokens
    const token = WhitelistTokenMap[evt.args.token.toLowerCase()]
    ctx.eventLogger.emit("vault.collectSwapFees", {
      token: token.symbol,
      feeUsd: Number(evt.args.feeUsd) / Math.pow(10, 30),
      feeTokens: Number(evt.args.feeTokens) / 10 ** token.decimal
    })
  })
  .onTimeInterval(gaugeTokenAum, 240, 1440)


FulProcessor.bind({ address: FUL, network: EthChainId.CRONOS })
  .onBlockInterval(async (block, ctx) => {
    const total = await ctx.contract.totalSupply()
    ctx.meter.Gauge("ful_totalSupply").record(total.scaleDown(18))
  }, 1000, 10000)
  .onTimeInterval(gaugeStakedAssets, 240, 1440)


FlpManagerProcessor.bind({ address: FUL_MANAGER, network: EthChainId.CRONOS })
  .onEventAddLiquidity(async (evt, ctx) => {
    const collateral = WhitelistTokenMap[evt.args.token.toLowerCase()]
    ctx.eventLogger.emit("flpManager.addLiquidity", {
      distinctId: evt.args.account,
      token: collateral.symbol,
      coin_symbol: collateral.symbol,
      amount: Number(evt.args.amount) / Math.pow(10, collateral.decimal),
      mintAmount: Number(evt.args.mintAmount) / Math.pow(10, 18)
    })
  })
  .onEventRemoveLiquidity(async (evt, ctx) => {
    const collateral = WhitelistTokenMap[evt.args.token.toLowerCase()]
    ctx.eventLogger.emit("flpManager.removeLiquidity", {
      distinctId: evt.args.account,
      token: collateral.symbol,
      coin_symbol: collateral.symbol,
      flpAmount: Number(evt.args.flpAmount) / Math.pow(10, 18),
      amountOut: Number(evt.args.amountOut) / Math.pow(10, collateral.decimal)
    })
  })
  .onTimeInterval(async (_, ctx) => {
    //record aum of pool assets
    try {
      const aum = Number(await ctx.contract.getAum(true, { blockTag: ctx.blockNumber })) / Math.pow(10, 30)
      ctx.meter.Gauge("aum_pool").record(aum)
    } catch (e) { console.log(`get aum error ${ctx.timestamp}`) }
  }, 240, 1440)

//FUL FLP stake
RewardRouterProcessor.bind({ address: REWARD_ROUTER, network: EthChainId.CRONOS })
  .onEventStakeFlp(async (evt, ctx) => {
    ctx.eventLogger.emit("rewardRouter.stakeFlp", {
      distinctId: evt.args.account,
      amount: Number(evt.args.amount) / Math.pow(10, 18)
    })
  })
  .onEventUnstakeFlp(async (evt, ctx) => {
    ctx.eventLogger.emit("rewardRouter.unstakeFlp", {
      distinctId: evt.args.account,
      amount: Number(evt.args.amount) / Math.pow(10, 18)
    })
  })
  .onEventStakeFul(async (evt, ctx) => {
    //token==FUL
    if (evt.args.token.toLowerCase() == FUL) {
      ctx.eventLogger.emit("rewardRouter.stakeFul", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
    }
    //token==esFUL
    else if (evt.args.token.toLowerCase() == esFUL) {
      ctx.eventLogger.emit("rewardRouter.stakeEsFUL", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
    }
  })
  .onEventUnstakeFul(async (evt, ctx) => {
    //token==FUL
    if (evt.args.token.toLowerCase() == FUL) {
      ctx.eventLogger.emit("rewardRouter.unstakeFul", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
    }
    //token==esFUL
    else if (evt.args.token.toLowerCase() == esFUL) {
      ctx.eventLogger.emit("rewardRouter.unstakeEsFUL", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
    }
  })