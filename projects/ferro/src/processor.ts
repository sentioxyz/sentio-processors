import * as constant from "./constant.js"
import { SwapProcessor } from "./types/eth/swap.js"
import { AddLiquidityEvent, SwapContext } from "./types/eth/swap.js"
import { EthChainId } from "@sentio/sdk/eth"
import { FerProcessor } from "./types/eth/fer.js"
import { getPriceBySymbol } from "@sentio/sdk/utils"
import { FerroFarmProcessor } from "./types/eth/ferrofarm.js"
import { FerroBoostProcessor } from "./types/eth/ferroboost.js"
import { FerroBarProcessor } from "./types/eth/ferrobar.js"
import { FerContext, TransferEvent } from "./types/eth/fer.js"
import { FerroBarContext } from "./types/eth/ferrobar.js"
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';
import { PoolProcessor } from "./types/eth/pool.js"
import { Gauge_3FER_TVL, Gauge_2FER_TVL, Gauge_LCRO_WCRO_TVL, Gauge_LATOM_ATOM_TVL } from './helper/gaugeTVL.js'
import './pancake.js'

//Ferro DAI/USDC/USDT Swap
SwapProcessor.bind({
  address: constant.SWAP_3FER,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro DAI/USDC/USDT"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply

    const DAI_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
    // ctx.meter.Counter("add_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
    const USDC_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
    const USDT_amount = Number(tokenAmounts[2]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })

    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      DAI_amount,
      USDC_amount,
      USDT_amount,
      poolName,
      project: "ferro",
    })
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro DAI/USDC/USDT"

    const DAI_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
    // ctx.meter.Counter("remove_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
    const USDC_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
    const USDT_amount = Number(tokenAmounts[2]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      DAI_amount,
      USDC_amount,
      USDT_amount,
      poolName,
      project: "ferro"
    })
  })
  .onEventRemoveLiquidityOne(async (event, ctx) => {
    const provider = event.args.provider
    const tokensBought = event.args.tokensBought
    const boughtId = Number(event.args.boughtId)
    const poolName = "Ferro DAI/USDC/USDT"

    let amount = 0
    switch (boughtId) {
      case 0:
        amount = Number(tokensBought) / Math.pow(10, 18)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "DAI", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 6)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDC", poolName })
        break
      case 2:
        amount = Number(tokensBought) / Math.pow(10, 6)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDT", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      coin_symbol: boughtId == 0 ? "DAI" : (boughtId == 1 ? "USDC" : "USDT"),
      poolName,
      project: "ferro"
    })
  })
  .onEventTokenSwap(async (event, ctx) => {
    const poolName = "Ferro DAI/USDC/USDT"
    const soldId = Number(event.args.soldId)
    const boughtId = Number(event.args.boughtId)
    const tokensSold = Number(event.args.tokensSold) / Math.pow(10, soldId == 0 ? 18 : 6)
    const coin_symbol = soldId == 0 ? "DAI" : (soldId == 1 ? "USDC" : "USDT")
    const coin_price = Number(await getPriceBySymbol(coin_symbol, ctx.timestamp))
    const volume = tokensSold * coin_price
    ctx.eventLogger.emit("TokenSwap", {
      distinctId: event.args.buyer,
      tokensSold: Number(event.args.tokensSold) / Math.pow(10, soldId == 0 ? 18 : 6),
      tokensBought: Number(event.args.tokensBought) / Math.pow(10, boughtId == 0 ? 18 : 6),
      soldId,
      boughtId,
      coin_symbol,
      volume,
      poolName,
      project: "ferro"
    })
    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName, project: "ferro" })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName, project: "ferro" })
    // ctx.meter.Gauge("swap_fee_gauge").record(0.0004 * volume, { coin_symbol, poolName })
    // ctx.meter.Gauge("admin_fee_gauge").record(0.0004 * 0.5 * volume, { coin_symbol, poolName })


  })
  .onTimeInterval(Gauge_3FER_TVL, 60, 120)

//Ferro USDC/USDT Swap
SwapProcessor.bind({
  address: constant.SWAP_2FER,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro USDC/USDT"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply

    const USDC_amount = Number(tokenAmounts[0]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
    const USDT_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })

    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      USDC_amount,
      USDT_amount,
      poolName,
      project: "ferro"
    })
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro USDC/USDT"
    const USDC_amount = Number(tokenAmounts[0]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
    const USDT_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })


    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      USDC_amount,
      USDT_amount,
      poolName,
      project: "ferro"
    })
  })
  .onEventRemoveLiquidityOne(async (event, ctx) => {
    const provider = event.args.provider
    const tokensBought = event.args.tokensBought
    const boughtId = Number(event.args.boughtId)
    const poolName = "Ferro USDC/USDT"

    let amount = 0
    switch (boughtId) {
      case 0:
        amount = Number(tokensBought) / Math.pow(10, 6)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDC", poolName, project: "ferro" })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 6)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDT", poolName, project: "ferro" })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      coin_symbol: boughtId == 0 ? "USDC" : "USDT",
      poolName,
      project: "ferro"
    })
  })
  .onEventTokenSwap(async (event, ctx) => {
    const poolName = "Ferro USDC/USDT"
    const soldId = Number(event.args.soldId)
    const tokensSold = Number(event.args.tokensSold) / Math.pow(10, 6)
    const coin_symbol = soldId == 0 ? "USDC" : "USDT"
    const coin_price = Number(await getPriceBySymbol(coin_symbol, ctx.timestamp))
    const volume = tokensSold * coin_price

    ctx.eventLogger.emit("TokenSwap", {
      distinctId: event.args.buyer,
      tokensSold: Number(event.args.boughtId),
      tokensBought: Number(event.args.tokensBought) / Math.pow(10, 6),
      soldId,
      boughtId: Number(event.args.boughtId),
      coin_symbol,
      volume,
      poolName,
      project: "ferro"
    })

    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName, project: "ferro" })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName, project: "ferro" })
    // ctx.meter.Gauge("swap_fee_gauge").record(0.0004 * volume, { coin_symbol, poolName })
    // ctx.meter.Gauge("admin_fee_gauge").record(0.0004 * 0.5 * volume, { coin_symbol, poolName })
  })
  .onTimeInterval(Gauge_2FER_TVL, 60, 120)

//LCRO-WCRO Swap
SwapProcessor.bind({
  address: constant.SWAP_LCRO_WCRO,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LCRO/WCRO"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply
    const LCRO_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
    // ctx.meter.Counter("add_liquidity_amount").add(LCRO_amount, { coin_symbol: "LCRO", poolName })
    const WCRO_amount = Number(tokenAmounts[1]) / Math.pow(10, 18)
    // ctx.meter.Counter("add_liquidity_amount").add(WCRO_amount, { coin_symbol: "CRO", poolName })

    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      LCRO_amount,
      WCRO_amount,
      poolName,
      project: "ferro"
    })
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LCRO/WCRO"
    const LCRO_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
    // ctx.meter.Counter("remove_liquidity_amount").add(LCRO_amount, { coin_symbol: "LCRO", poolName })
    const WCRO_amount = Number(tokenAmounts[1]) / Math.pow(10, 18)
    // ctx.meter.Counter("remove_liquidity_amount").add(WCRO_amount, { coin_symbol: "CRO", poolName })

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      LCRO_amount,
      WCRO_amount,
      poolName,
      project: "ferro"
    })
  })
  .onEventRemoveLiquidityOne(async (event, ctx) => {
    const provider = event.args.provider
    const tokensBought = event.args.tokensBought
    const boughtId = Number(event.args.boughtId)
    const poolName = "Ferro LCRO/WCRO"

    let amount = 0
    switch (boughtId) {
      case 0:
        amount = Number(tokensBought) / Math.pow(10, 18)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "LCRO", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 18)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "CRO", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      coin_symbol: boughtId == 0 ? "LCRO" : "CRO",
      poolName,
      project: "ferro"
    })
  })
  .onEventTokenSwap(async (event, ctx) => {
    const poolName = "Ferro LCRO/WCRO"
    const soldId = Number(event.args.soldId)
    const tokensSold = Number(event.args.tokensSold) / Math.pow(10, 18)
    const tokensBought = Number(event.args.tokensBought) / Math.pow(10, 18)
    const coin_symbol = soldId == 0 ? "LCRO" : "CRO"
    const cro_price = Number(await getPriceBySymbol("CRO", ctx.timestamp))
    const volume = soldId == 1 ? tokensSold * cro_price : tokensBought * cro_price

    ctx.eventLogger.emit("TokenSwap", {
      distinctId: event.args.buyer,
      tokensSold,
      tokensBought,
      soldId,
      boughtId: Number(event.args.boughtId),
      volume,
      coin_symbol,
      poolName,
      project: "ferro"
    })
    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName, project: "ferro" })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName, project: "ferro" })
    // ctx.meter.Gauge("swap_fee_gauge").record(0.0004 * volume, { coin_symbol, poolName })
    // ctx.meter.Gauge("admin_fee_gauge").record(0.0004 * 0.5 * volume, { coin_symbol, poolName })

  })
  .onTimeInterval(Gauge_LCRO_WCRO_TVL, 60, 120)



//LATOM-ATOM
SwapProcessor.bind({
  address: constant.SWAP_LATOM_ATOM,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LATOM/ATOM"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply
    const LATOM_amount = Number(tokenAmounts[0]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(LATOM_amount, { coin_symbol: "LATOM", poolName })
    const ATOM_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("add_liquidity_amount").add(ATOM_amount, { coin_symbol: "ATOM", poolName })

    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      LATOM_amount,
      ATOM_amount,
      poolName, project: "ferro"
    })
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LATOM/ATOM"
    const LATOM_amount = Number(tokenAmounts[0]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(LATOM_amount, { coin_symbol: "LATOM", poolName })
    const ATOM_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
    // ctx.meter.Counter("remove_liquidity_amount").add(ATOM_amount, { coin_symbol: "ATOM", poolName })

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      LATOM_amount,
      ATOM_amount,
      poolName, project: "ferro"
    })
  })
  .onEventRemoveLiquidityOne(async (event, ctx) => {
    const provider = event.args.provider
    const tokensBought = event.args.tokensBought
    const boughtId = Number(event.args.boughtId)
    const poolName = "Ferro LATOM/ATOM"

    let amount = 0
    switch (boughtId) {
      case 0:
        amount = Number(tokensBought) / Math.pow(10, 6)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "LATOM", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 6)
        // ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "ATOM", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      coin_symbol: boughtId == 0 ? "LATOM" : "ATOM",
      poolName, project: "ferro"
    })
  })
  .onEventTokenSwap(async (event, ctx) => {
    const poolName = "Ferro LATOM/ATOM"
    const soldId = Number(event.args.soldId)
    const tokensSold = Number(event.args.tokensSold) / Math.pow(10, 6)
    const tokensBought = Number(event.args.tokensBought) / Math.pow(10, 6)
    const coin_symbol = soldId == 0 ? "LATOM" : "ATOM"
    const atom_price = Number(await getPriceBySymbol("ATOM", ctx.timestamp))
    const volume = soldId == 1 ? tokensSold * atom_price : tokensBought * atom_price

    ctx.eventLogger.emit("TokenSwap", {
      distinctId: event.args.buyer,
      tokensSold,
      tokensBought,
      soldId,
      boughtId: Number(event.args.boughtId),
      volume,
      coin_symbol,
      poolName, project: "ferro"
    })
    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName })
    // ctx.meter.Gauge("swap_fee_gauge").record(0.0004 * volume, { coin_symbol, poolName })
    // ctx.meter.Gauge("admin_fee_gauge").record(0.0004 * 0.5 * volume, { coin_symbol, poolName })

  })
  .onTimeInterval(Gauge_LATOM_ATOM_TVL, 60, 120)




//pool
FerroFarmProcessor.bind({
  address: constant.FerroFarm,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventDeposit(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    ctx.eventLogger.emit("PoolDeposit", {
      distinctId: user,
      pid,
      amount, project: "ferro"
    })
    ctx.meter.Counter("pool_counter").add(amount, { pid: pid.toString(), project: "ferro" })
  })
  .onEventWithdraw(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    ctx.eventLogger.emit("PoolWithdraw", {
      distinctId: user,
      pid,
      amount, project: "ferro"
    })
    ctx.meter.Counter("pool_counter").sub(amount, { pid: pid.toString(), project: "ferro" })

  })

//vault
FerroBoostProcessor.bind({
  address: constant.FerroBoost,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  .onEventDeposit(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    const stakeId = Number(event.args.stakeId)
    const weightedAmount = Number(event.args.weightedAmount) / Math.pow(10, 18)
    const unlockTimestamp = Number(event.args.unlockTimestamp)
    ctx.eventLogger.emit("VaultDeposit", {
      distinctId: user,
      pid,
      amount,
      stakeId,
      weightedAmount,
      unlockTimestamp, project: "ferro"
    })
    ctx.meter.Counter("vault_counter").add(amount, { pid: pid.toString(), project: "ferro" })

  })
  .onEventWithdraw(async (event, ctx) => {
    const user = event.args.user
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    const stakeId = Number(event.args.stakeId)
    const weightedAmount = Number(event.args.weightedAmount) / Math.pow(10, 18)
    let pid = -1
    try {
      const stake = await ctx.contract.getUserStake(user, stakeId)
      pid = Number(stake[1])
      ctx.eventLogger.emit("VaultWithdraw", {
        distinctId: user,
        stakeId,
        pid,
        amount,
        weightedAmount, project: "ferro"
      })
      ctx.meter.Counter("vault_counter").sub(amount, { pid: pid.toString(), project: "ferro" })
    }
    catch (e) { console.log(`get pid failed at ${ctx.transactionHash}`) }
  })



const transferEventHandler = async (event: TransferEvent, ctx: FerContext | FerroBarContext) => {
  ctx.eventLogger.emit("Transfer", {
    distinctId: event.args.from.toLowerCase(),
    user_address: event.args.from.toLowerCase(),
    amount: - Number(event.args.value) / Math.pow(10, 18)
  })
  ctx.eventLogger.emit("Transfer", {
    distinctId: event.args.to.toLowerCase(),
    user_address: event.args.to.toLowerCase(),
    amount: Number(event.args.value) / Math.pow(10, 18)
  })
}


//$FER
FerProcessor.bind({
  address: constant.FerroToken,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  // .onEventTransfer(transferEventHandler)
  .onTimeInterval(async (_, ctx) => {
    try {
      const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 18)
      let teamBalance = 0
      for (let i = 0; i < constant.TEAM_WALLETS.length; i++) {
        teamBalance += Number(await ctx.contract.balanceOf(constant.TEAM_WALLETS[i])) / Math.pow(10, 18)
      }
      const marketCap = totalSupply - teamBalance
      ctx.meter.Gauge("FER_marketCap").record(marketCap, { coin_symbol: "FER", project: "ferro" })
      ctx.meter.Gauge("FER_totalSupply").record(totalSupply, { coin_symbol: "FER", project: "ferro" })
    }
    catch (e) { console.log(`gauge FER error at ${ctx.transactionHash}`) }
  }, 60, 120)
//$xFER
FerroBarProcessor.bind({
  address: constant.FerroBar,
  network: EthChainId.CRONOS,
  //startBlock: 8400000
})
  //.onEventTransfer(transferEventHandler)
  .onTimeInterval(async (_, ctx) => {
    try {
      const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 18)
      ctx.meter.Gauge("xFER_totalSupply").record(totalSupply, { coin_symbol: "xFER", project: "ferro" })
      let teamBalance = 0
      for (let i = 0; i < constant.TEAM_WALLETS.length; i++) {
        teamBalance += Number(await ctx.contract.balanceOf(constant.TEAM_WALLETS[i])) / Math.pow(10, 18)
      }
      const marketCap = totalSupply - teamBalance
      ctx.meter.Gauge("xFER_marketCap").record(marketCap, { coin_symbol: "xFER", project: "ferro" })
    }
    catch (e) { console.log(`gauge xFER error at ${ctx.transactionHash}`) }
  }, 60, 120)


