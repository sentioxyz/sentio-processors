import { VaultProcessor } from './types/eth/vault.js'
import { FlpManagerProcessor } from './types/eth/flpmanager.js'
import { EthChainId } from "@sentio/sdk/eth";
import { FulProcessor } from './types/eth/ful.js'
import { RewardRouterProcessor } from './types/eth/rewardrouter.js'
import { gaugeTokenAum, gaugeStakedAssets } from './helper/fulcrom-helper.js';
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { FUL_ADDRESS_MAP, sFUL_ADDRESS_MAP, esFUL_ADDRESS_MAP, vFLP_ADDRESS_MAP, vFUL_ADDRESS_MAP, VAULT_ADDRESS_MAP, FUL_MANAGER_ADDRESS_MAP, REWARD_ROUTER_ADDRESS_MAP, CHAINS } from './helper/constant.js'
import { getOrCreateCoin } from './helper/fulcrom-helper.js';
import { VesterProcessor } from './types/eth/vester.js';


CHAINS.forEach(chain => {
  VaultProcessor.bind({ address: VAULT_ADDRESS_MAP.get(chain)!, network: chain })
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
      ctx.meter.Gauge("vault_increase_position_gauge").record(sizeDelta, { coin_symbol: collateral.symbol })
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
      ctx.meter.Gauge("vault_decrease_position_gauge").record(sizeDelta, { coin_symbol: collateral.symbol })

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
        amountOut: Number(evt.args.amountOut) / Math.pow(10, tokenOut.decimal),
        pairName: (tokenIn.symbol < tokenOut.symbol) ? tokenIn.symbol + "-" + tokenOut.symbol : tokenOut.symbol + "-" + tokenIn.symbol
      })
      ctx.meter.Gauge("swap_gauge").record(Number(evt.args.amountIn) / Math.pow(10, tokenIn.decimal), { coin_symbol: tokenIn.symbol })

    })
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
      ctx.meter.Gauge("swap_gauge").record(Number(evt.args.size) / Math.pow(10, 30), { coin_symbol: collateral.symbol })

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
      ctx.meter.Gauge("vault_collect_margin_fee_gauge").record(Number(evt.args.feeUsd) / Math.pow(10, 30), { coin_symbol: token.symbol })

    })
    .onEventCollectSwapFees(async (evt, ctx) => {
      //todo: check decimal of other tokens
      const token = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
      ctx.eventLogger.emit("vault.collectSwapFees", {
        token: token.symbol,
        feeUsd: Number(evt.args.feeUsd) / Math.pow(10, 30),
        feeTokens: Number(evt.args.feeTokens) / 10 ** token.decimal
      })
      ctx.meter.Gauge("vault_collect_swap_fee_gauge").record(Number(evt.args.feeUsd) / Math.pow(10, 30), { coin_symbol: token.symbol })

    })
    .onTimeInterval(gaugeTokenAum, 240, 240)


  FulProcessor.bind({ address: FUL_ADDRESS_MAP.get(chain)!, network: chain })
    .onBlockInterval(async (block, ctx) => {
      const total = await ctx.contract.totalSupply()
      ctx.meter.Gauge("ful_totalSupply").record(total.scaleDown(18))
    }, 1000, 10000)
    .onTimeInterval(gaugeStakedAssets, 240, 240)


  FlpManagerProcessor.bind({ address: FUL_MANAGER_ADDRESS_MAP.get(chain)!, network: chain })
    .onEventAddLiquidity(async (evt, ctx) => {
      const collateral = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
      ctx.eventLogger.emit("flpManager.addLiquidity", {
        distinctId: evt.args.account,
        token: collateral.symbol,
        coin_symbol: collateral.symbol,
        amount: Number(evt.args.amount) / Math.pow(10, collateral.decimal),
        mintAmount: Number(evt.args.mintAmount) / Math.pow(10, 18)
      })
      ctx.meter.Gauge("flp_add_liquidity_gauge").record(Number(evt.args.amount) / Math.pow(10, collateral.decimal), { coin_symbol: collateral.symbol })

    })
    .onEventRemoveLiquidity(async (evt, ctx) => {
      const collateral = await getOrCreateCoin(ctx, evt.args.token.toLowerCase())
      ctx.eventLogger.emit("flpManager.removeLiquidity", {
        distinctId: evt.args.account,
        token: collateral.symbol,
        coin_symbol: collateral.symbol,
        flpAmount: Number(evt.args.flpAmount) / Math.pow(10, 18),
        amountOut: Number(evt.args.amountOut) / Math.pow(10, collateral.decimal)
      })
      ctx.meter.Gauge("flp_remove_liquidity_gauge").record(Number(evt.args.amountOut) / Math.pow(10, collateral.decimal), { coin_symbol: collateral.symbol })

    })
    .onTimeInterval(async (_, ctx) => {
      //record aum of pool assets
      try {
        const aum = Number(await ctx.contract.getAum(true, { blockTag: ctx.blockNumber })) / Math.pow(10, 30)
        ctx.meter.Gauge("aum_pool").record(aum)
      } catch (e) { console.log(`get aum error ${ctx.timestamp}`) }
    }, 240, 240)

  //FUL FLP stake
  RewardRouterProcessor.bind({ address: REWARD_ROUTER_ADDRESS_MAP.get(chain)!, network: chain })
    .onEventStakeFlp(async (evt, ctx) => {
      ctx.eventLogger.emit("rewardRouter.stakeFlp", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
      ctx.meter.Gauge("stake_flp_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))

    })
    .onEventUnstakeFlp(async (evt, ctx) => {
      ctx.eventLogger.emit("rewardRouter.unstakeFlp", {
        distinctId: evt.args.account,
        amount: Number(evt.args.amount) / Math.pow(10, 18)
      })
      ctx.meter.Gauge("unstake_flp_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))
    })
    .onEventStakeFul(async (evt, ctx) => {
      //token==FUL
      if (evt.args.token.toLowerCase() == FUL_ADDRESS_MAP.get(chain)) {
        ctx.eventLogger.emit("rewardRouter.stakeFul", {
          distinctId: evt.args.account,
          amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
        ctx.meter.Gauge("stake_ful_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))

      }
      //token==esFUL
      else if (evt.args.token.toLowerCase() == esFUL_ADDRESS_MAP.get(chain)) {
        ctx.eventLogger.emit("rewardRouter.stakeEsFUL", {
          distinctId: evt.args.account,
          amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
        ctx.meter.Gauge("stake_esful_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))
      }
    })
    .onEventUnstakeFul(async (evt, ctx) => {
      //token==FUL
      if (evt.args.token.toLowerCase() == FUL_ADDRESS_MAP.get(chain)) {
        ctx.eventLogger.emit("rewardRouter.unstakeFul", {
          distinctId: evt.args.account,
          amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
        ctx.meter.Gauge("unstake_ful_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))

      }
      //token==esFUL
      else if (evt.args.token.toLowerCase() == esFUL_ADDRESS_MAP.get(chain)) {
        ctx.eventLogger.emit("rewardRouter.unstakeEsFUL", {
          distinctId: evt.args.account,
          amount: Number(evt.args.amount) / Math.pow(10, 18)
        })
        ctx.meter.Gauge("unstake_esful_gauge").record(Number(evt.args.amount) / Math.pow(10, 18))
      }
    })



  const dauEventHandler = async (evt: any, ctx: any) => {
    console.log(`dau event`)
    ctx.eventLogger.emit(`vester_${evt.name}`, {
      //@ts-ignore
      distinctId: ctx.transaction.from
    })
  }

  VesterProcessor.bind({ address: vFUL_ADDRESS_MAP.get(chain)!, network: chain })
    // .onEventClaim(dauEventHandler, [], { transaction: true })
    // .onEventDeposit(dauEventHandler, [], { transaction: true })
    // .onEventWithdraw(dauEventHandler, [], { transaction: true })
    .onEventClaim(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.receiver
      })
    })
    .onEventDeposit(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.account
      })
    })
    .onEventWithdraw(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.account
      })
    })

  VesterProcessor.bind({ address: vFLP_ADDRESS_MAP.get(chain)!, network: chain })
    // .onEventClaim(dauEventHandler, [], { transaction: true })
    // .onEventDeposit(dauEventHandler, [], { transaction: true })
    // .onEventWithdraw(dauEventHandler, [], { transaction: true })
    .onEventClaim(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.receiver
      })
    })
    .onEventDeposit(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.account
      })
    })
    .onEventWithdraw(async (evt, ctx) => {
      ctx.eventLogger.emit(`vester_${evt.name}`, {
        distinctId: evt.args.account
      })
    })
})
