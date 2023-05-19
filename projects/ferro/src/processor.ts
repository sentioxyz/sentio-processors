import * as constant from "./constant.js"
import { SwapProcessor } from "./types/eth/swap.js"
import { AddLiquidityEvent, SwapContext } from "./types/eth/swap.js"
import { EthChainId } from "@sentio/sdk"
import { FerProcessor } from "./types/eth/fer.js"
import { getPriceBySymbol } from "@sentio/sdk/utils"
import { FerroFarmProcessor } from "./types/eth/ferrofarm.js"
import { FerroBoostProcessor } from "./types/eth/ferroboost.js"
import { FerroBarProcessor } from "./types/eth/ferrobar.js"
import { FerContext, TransferEvent } from "./types/eth/fer.js"
import { FerroBarContext } from "./types/eth/ferrobar.js"
import { PoolProcessor } from "./types/eth/pool.js"

SwapProcessor.bind({
  address: constant.SWAP_3FER,
  network: EthChainId.CRONOS
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro DAI/USDC/USDT"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply
    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      tokenAmounts: JSON.stringify(tokenAmounts),
      coin_symbol: "DAI",
      poolName
    })
    for (let i = 0; i < 3; i++) {
      switch (i) {
        case 0:
          const DAI_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("add_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
          break
        case 1:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 2:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("add_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })
          break
      }
    }
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro DAI/USDC/USDT"

    for (let i = 0; i < 3; i++) {
      switch (i) {
        case 0:
          const DAI_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("remove_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
          break
        case 1:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 2:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })
          break
      }
    }

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      tokenAmounts: JSON.stringify(tokenAmounts),
      coin_symbol: "DAI",
      poolName
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
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "DAI", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 6)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDC", poolName })
        break
      case 2:
        amount = Number(tokensBought) / Math.pow(10, 6)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDT", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      coin_symbol: "DAI",
      poolName
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
      poolName
    })
    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName })

  })


SwapProcessor.bind({
  address: constant.SWAP_2FER,
  network: EthChainId.CRONOS
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro USDC/USDT"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply
    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      tokenAmounts: JSON.stringify(tokenAmounts),
      poolName
    })
    for (let i = 0; i < 2; i++) {
      switch (i) {
        case 0:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 1:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("add_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })
          break
      }
    }
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro USDC/USDT"

    for (let i = 0; i < 2; i++) {
      switch (i) {
        case 0:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 1:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })
          break
      }
    }

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      tokenAmounts: JSON.stringify(tokenAmounts),
      poolName
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
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDC", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 6)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "USDT", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      poolName
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
      poolName
    })

    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName })

  })


SwapProcessor.bind({
  address: constant.SWAP_LCRO_WCRO,
  network: EthChainId.CRONOS
})
  .onEventAddLiquidity(async (event: AddLiquidityEvent, ctx: SwapContext) => {
    const provider = event.args.provider
    const fees = event.args.fees
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LCRO/WCRO"
    const invariant = event.args.invariant
    const lpTokenSupply = event.args.lpTokenSupply
    ctx.eventLogger.emit("AddLiquidity", {
      distinctId: provider,
      invariant,
      lpTokenSupply,
      tokenAmounts: JSON.stringify(tokenAmounts),
      poolName
    })
    for (let i = 0; i < 2; i++) {
      switch (i) {
        case 0:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "LCRO", poolName })
          break
        case 1:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("add_liquidity_amount").add(USDT_amount, { coin_symbol: "WCRO", poolName })
          break
      }
    }
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const provider = event.args.provider
    const tokenAmounts = event.args.tokenAmounts
    const poolName = "Ferro LCRO/WCRO"

    for (let i = 0; i < 2; i++) {
      switch (i) {
        case 0:
          const USDC_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "LCRO", poolName })
          break
        case 1:
          const USDT_amount = Number(tokenAmounts[i]) / Math.pow(10, 18)
          ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "WCRO", poolName })
          break
      }
    }

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
      tokenAmounts: JSON.stringify(tokenAmounts),
      poolName
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
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "LCRO", poolName })
        break
      case 1:
        amount = Number(tokensBought) / Math.pow(10, 18)
        ctx.meter.Counter("remove_liquidity_amount").add(amount, { coin_symbol: "WCRO", poolName })
        break

    }
    ctx.eventLogger.emit("RemoveLiquidityOne", {
      distinctId: provider,
      amount,
      poolName
    })
  })
  .onEventTokenSwap(async (event, ctx) => {
    const poolName = "Ferro LCRO/WCRO"
    const soldId = Number(event.args.soldId)
    const tokensSold = Number(event.args.tokensSold) / Math.pow(10, 18)
    const tokensBought = Number(event.args.tokensBought) / Math.pow(10, 18)
    const coin_symbol = soldId == 0 ? "LCRO" : "WCRO"
    const cro_price = Number(await getPriceBySymbol("CRO", ctx.timestamp))
    const volume = soldId == 1 ? tokensSold * cro_price : tokensBought & cro_price

    ctx.eventLogger.emit("TokenSwap", {
      distinctId: event.args.buyer,
      tokensSold,
      tokensBought,
      soldId,
      boughtId: Number(event.args.boughtId),
      volume,
      coin_symbol,
      poolName
    })
    ctx.meter.Counter("swap_vol_counter").add(volume, { coin_symbol, poolName })
    ctx.meter.Gauge("swap_vol_gauge").record(volume, { coin_symbol, poolName })


  })









FerroFarmProcessor.bind({
  address: constant.FerroFarm,
  network: EthChainId.CRONOS
})
  .onEventDeposit(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount)
    ctx.eventLogger.emit("PoolDeposit", {
      distinctId: user,
      pid,
      amount
    })
    ctx.meter.Counter("pool_counter").add(amount, { pid: pid.toString() })
  })
  .onEventWithdraw(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount)
    ctx.eventLogger.emit("PoolWithdraw", {
      distinctId: user,
      pid,
      amount
    })
    ctx.meter.Counter("pool_counter").sub(amount, { pid: pid.toString() })

  })


FerroBoostProcessor.bind({
  address: constant.FerroBoost,
  network: EthChainId.CRONOS
})
  .onEventDeposit(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount)
    const stakeId = Number(event.args.stakeId)
    const weightedAmount = Number(event.args.weightedAmount)
    const unlockTimestamp = Number(event.args.unlockTimestamp)
    ctx.eventLogger.emit("VaultDeposit", {
      distinctId: user,
      pid,
      amount,
      stakeId,
      weightedAmount,
      unlockTimestamp
    })
    ctx.meter.Counter("vault_counter").add(amount, { pid: pid.toString() })

  })
  .onEventWithdraw(async (event, ctx) => {
    const user = event.args.user
    const amount = Number(event.args.amount)
    const stakeId = Number(event.args.stakeId)
    const weightedAmount = Number(event.args.weightedAmount)

    ctx.eventLogger.emit("VaultWithdraw", {
      distinctId: user,
      stakeId,
      amount,
      weightedAmount
    })
    ctx.meter.Counter("vault_counter").sub(amount, {})

  })



const transferEventHandler = async (event: TransferEvent, ctx: FerContext | FerroBarContext) => {
  ctx.eventLogger.emit("TransferFrom", {
    address: event.args.from.toLowerCase(),
    amount: - Number(event.args.value) / Math.pow(10, 18)
  })
  ctx.eventLogger.emit("TransferTo", {
    address: event.args.to.toLowerCase(),
    amount: Number(event.args.value) / Math.pow(10, 18)
  })
}


//$FER
FerProcessor.bind({
  address: constant.FerroToken,
  network: EthChainId.CRONOS
})
  .onEventTransfer(transferEventHandler)
  .onTimeInterval(async (_, ctx) => {
    const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 18)
    const teamBalance = Number(await ctx.contract.balanceOf(constant.TEAM_ADDRESS)) / Math.pow(10, 18)
    const marketCap = totalSupply - teamBalance
    ctx.meter.Gauge("FER_marketCap").record(marketCap, { coin_symbol: "FER" })
    ctx.meter.Gauge("FER_totalSupply").record(totalSupply, { coin_symbol: "FER" })

  }, 60, 10)
//$xFER
FerroBarProcessor.bind({
  address: constant.FerroBar,
  network: EthChainId.CRONOS
})
  .onEventTransfer(transferEventHandler)
  .onTimeInterval(async (_, ctx) => {
    const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 18)
    const teamBalance = Number(await ctx.contract.balanceOf(constant.TEAM_ADDRESS)) / Math.pow(10, 18)
    const marketCap = totalSupply - teamBalance
    ctx.meter.Gauge("xFER_marketCap").record(marketCap, { coin_symbol: "xFER" })
    ctx.meter.Gauge("xFER_totalSupply").record(totalSupply, { coin_symbol: "xFER" })
  }, 60, 10)


