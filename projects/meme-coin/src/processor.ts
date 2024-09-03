// @ts-nocheck
import { EthChainId } from "@sentio/sdk/eth"
import { UniswapV3PoolProcessor } from "./types/eth/uniswapv3pool.js"
import './helper.js'
import { getOrCreatePool } from "./helper.js"
import { scaleDown } from "@sentio/sdk"

const UNISWAPV3_POOL_MAPS = [
  "0xcf0BB95967cD006f5eaA1463c9d710D1E1550a96" //usdc.e - wifi
]



UniswapV3PoolProcessor.bind({
  address: UNISWAPV3_POOL_MAPS[i],
  network: EthChainId.ETHEREUM
})
  .onEventSwap(async (event, ctx) => {
    const poolInfo = await getOrCreatePool(ctx, UNISWAPV3_POOL_MAPS[i])

    let from = "unk"
    try {
      const hash = event.transactionHash
      const tx = (await ctx.contract.provider.getTransaction(hash))!
      from = tx.from
    }
    catch (e) {
      console.log(e.message, `Get tx from error at ${ctx.transactionHash}`)
    }

    ctx.eventLogger.emit("Swap", {
      distinctId: from,
      recipient: event.args.recipient,
      amount0: scaleDown(event.args.amount0, poolInfo.decimal0),
      amount1: scaleDown(event.args.amount1, poolInfo.decimal1),
      sqrtPriceX96: event.args.sqrtPriceX96,
      liquidity: event.args.liquidity,
      // tick: event.args.tick,
      symbol0: poolInfo.symbol0,
      symbol1: poolInfo.symbol1,
      pool: poolInfo.pairName,
      dexType: "UniswapV3"
    })
  })



for (let i = 0; i < ALGEBRA_POOL_MAPS.length; i++) {
  AlgebraPoolProcessor.bind({
    address: ALGEBRA_POOL_MAPS[i],
    network: EthChainId.POLYGON
  })
    .onEventSwap(async (event, ctx) => {
      const poolInfo = await getOrCreatePool(ctx, ALGEBRA_POOL_MAPS[i])

      ctx.eventLogger.emit("Swap", {
        distinctId: event.args.sender,
        recipient: event.args.recipient,
        amount0: scaleDown(event.args.amount0, poolInfo.decimal0),
        amount1: scaleDown(event.args.amount1, poolInfo.decimal1),
        sqrtPriceX96: event.args.price,
        liquidity: event.args.liquidity,
        // tick: event.args.tick,
        symbol0: poolInfo.symbol0,
        symbol1: poolInfo.symbol1,
        pool: poolInfo.pairName,
        dexType: "UniswapV3"
      })
    })
}



for (let i = 0; i < UNISWAPV2_PAIR_MAPS.length; i++) {
  UniswapV2PairProcessor.bind({
    address: UNISWAPV2_PAIR_MAPS[i],
    network: EthChainId.POLYGON
  })
    .onEventSwap(async (event, ctx) => {
      const poolInfo = await getOrCreatePool(ctx, UNISWAPV2_PAIR_MAPS[i])

      ctx.eventLogger.emit("Swap", {
        distinctId: event.args.sender,
        amount0: scaleDown(event.args.amount0Out - event.args.amount0In, poolInfo.decimal0),
        amount1: scaleDown(event.args.amount1Out - event.args.amount1In, poolInfo.decimal1),
        recipient: event.args.to,
        sqrtPriceX96: -1,
        liquidity: -1,
        // tick: "unk",
        symbol0: poolInfo.symbol0,
        symbol1: poolInfo.symbol1,
        pool: poolInfo.pairName,
        dexType: "UniswapV2"
      })
    })
}
