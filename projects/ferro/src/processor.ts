import { SWAP_3FER } from "./constant.js"
import { SwapProcessor } from "./types/eth/swap.js"
import { AddLiquidityEvent, SwapContext } from "./types/eth/swap.js"
import { EthChainId } from "@sentio/sdk"

SwapProcessor.bind({
  address: SWAP_3FER,
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
      poolName
    })
    for (let i = 0; i < 3; i++) {
      switch (i) {
        case 0:
          const DAI_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
          ctx.meter.Counter("add_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
          break
        case 1:
          const USDC_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
          ctx.meter.Counter("add_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 2:
          const USDT_amount = Number(tokenAmounts[2]) / Math.pow(10, 6)
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
          const DAI_amount = Number(tokenAmounts[0]) / Math.pow(10, 18)
          ctx.meter.Counter("remove_liquidity_amount").add(DAI_amount, { coin_symbol: "DAI", poolName })
          break
        case 1:
          const USDC_amount = Number(tokenAmounts[1]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDC_amount, { coin_symbol: "USDC", poolName })
          break
        case 2:
          const USDT_amount = Number(tokenAmounts[2]) / Math.pow(10, 6)
          ctx.meter.Counter("remove_liquidity_amount").add(USDT_amount, { coin_symbol: "USDT", poolName })
          break
      }
    }

    ctx.eventLogger.emit("RemoveLiquidity", {
      distinctId: provider,
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
      poolName
    })
  })

