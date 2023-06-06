import { VaultProcessor } from './types/eth/vault.js'
import { FlpManagerProcessor } from './types/eth/flpmanager.js'
import { EthChainId } from "@sentio/sdk/eth";
import { getOrCreateToken } from './helper/fulcrom-helper.js';

VaultProcessor.bind({ address: "0x8C7Ef34aa54210c76D6d5E475f43e0c11f876098", network: EthChainId.CRONOS })
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



FlpManagerProcessor.bind({ address: "0x6148107BcAC794d3fC94239B88fA77634983891F", network: EthChainId.CRONOS })
  .onEventAddLiquidity(async (evt, ctx) => {
    const tokenInfo = await getOrCreateToken(ctx, evt.args.token)
    ctx.eventLogger.emit("flpManager.addLiquidity", {
      distinctId: evt.args.account,
      token: tokenInfo.symbol,
      amount: Number(evt.args.amount) / Math.pow(10, tokenInfo.decimal),
      mintAmount: Number(evt.args.mintAmount) / Math.pow(10, 18)
    })
  })
  .onEventRemoveLiquidity(async (evt, ctx) => {
    const tokenInfo = await getOrCreateToken(ctx, evt.args.token)
    ctx.eventLogger.emit("flpManager.removeLiquidity", {
      distinctId: evt.args.account,
      token: tokenInfo.symbol,
      flpAmount: Number(evt.args.flpAmount) / Math.pow(10, tokenInfo.decimal),
      amountOut: Number(evt.args.amountOut) / Math.pow(10, 18)
    })
  })