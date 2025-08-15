import { EthChainId } from "@sentio/sdk/eth";
import { DEX_FACTORY_ADDRESS_MAP } from "./constant.js";
import { UniswapV2FactoryProcessor } from "./types/eth/uniswapv2factory.js"
import { UniswapV2PairProcessorTemplate } from "./types/eth/uniswapv2pair.js";

DEX_FACTORY_ADDRESS_MAP.forEach((address, project) => {
  UniswapV2FactoryProcessor.bind({
    address,
    network: EthChainId.TAIKO
  })
    .onEventPairCreated(async (event, ctx) => {
      ctx.meter.Counter("cumulative_pairs").add(1, { project });
      ctx.eventLogger.emit("PairCreated", {
        token0: event.args.token0,
        token1: event.args.token1,
        pair: event.args.pair,
        project
      })

      poolTemplate.bind({
        address: event.args.pair,
        network: EthChainId.TAIKO,
        startBlock: ctx.blockNumber,
        baseLabels: { project }
      }, ctx)

    })
})



const poolTemplate = new UniswapV2PairProcessorTemplate()
  .onEventSwap(async (event, ctx) => {
    // const info = await getOrCreatePool(ctx)

    // const address0 = info.token0Address
    // const address1 = info.token1Address
    // // console.log(address0, address1)

    // const symbol0 = info.token0.symbol
    // const symbol1 = info.token1.symbol
    // const decimal0 = info.token0.decimal
    // const decimal1 = info.token1.decimal
    // const pairName = symbol0 + "-" + symbol1

    // const amount0Out = Number(event.args.amount0Out) / Math.pow(10, decimal0)
    // const amount0In = Number(event.args.amount0In) / Math.pow(10, decimal0)
    // const amount1Out = Number(event.args.amount1Out) / Math.pow(10, decimal1)
    // const amount1In = Number(event.args.amount1In) / Math.pow(10, decimal1)

    // const ABS_Amount0 = (amount0In > amount0Out) ? (amount0In - amount0Out) : (amount0Out - amount0In)

    // // console.log("Token0:", symbol0, "amount0Out:", amount0Out, " amount0In:", amount0In, "Token1:", symbol1, "amount1Out:", amount1Out, "amount1In:", amount1In)

    // //counter swap & gauge
    // ctx.meter.Counter('swap_counter').add(1, { pairName: pairName })
    // swap_gauge.record(ctx, 1, { pairName: pairName })


    // //Gauge reserve
    // const getReserve = await ctx.contract.getReserves()
    // const reserve0 = Number(getReserve[0]) / Math.pow(10, decimal0)
    // const reserve1 = Number(getReserve[1]) / Math.pow(10, decimal1)
    // const blockTimestampLast = getReserve[2]
    // // console.log("reserve0:", reserve0, " reserve1:", reserve1, "blockTimestampLast:", blockTimestampLast, "blockTimestampNow:", ctx.timestamp)
    // ctx.meter.Gauge('reserve0').record(reserve0, { pairName: pairName })
    // ctx.meter.Gauge('reserve1').record(reserve1, { pairName: pairName })


    // //trading volume
    // try {
    //   const token0Price = (await getPriceBySymbol(symbol0, ctx.timestamp, { toleranceInDays: 365 }))!
    //   const token1Price = (await getPriceBySymbol(symbol1, ctx.timestamp, { toleranceInDays: 365 }))!
    //   if (token0Price == null) {
    //     console.log("null token0 price" + symbol0)
    //   }
    //   else if (token1Price == null) {
    //     console.log("null token1 price" + symbol1)
    //   }
    //   else {
    //     const volume0 = ABS_Amount0 * token0Price
    //     // console.log("token0 " + symbol0 + " Price:", token0Price, "Swap amount0", ABS_Amount0, " volume:", volume0)
    //     // console.log("token1 " + symbol1 + " Price:", token1Price)

    //     //gauge reserve usd value
    //     const liquidity0 = reserve0 * token0Price
    //     const liquidity1 = reserve1 * token1Price
    //     ctx.meter.Gauge('reserve0_USD').record(liquidity0, { pairName: pairName })
    //     ctx.meter.Gauge('reserve1_USD').record(liquidity1, { pairName: pairName })
    //     ctx.meter.Gauge('total_liquitity_USD').record(liquidity0 + liquidity1, { pairName: pairName })


    //     //eventLogger
    //     ctx.eventLogger.emit("swap", {
    //       distinctId: event.args.sender,
    //       token0: symbol0,
    //       token1: symbol1,
    //       amount0In: amount0In,
    //       amount1In: amount1In,
    //       amount0Out: amount0Out,
    //       amount1Out: amount1Out,
    //       ABS_Amount0: ABS_Amount0,
    //       tradingVolume: volume0,
    //       pairName: pairName,
    //       message: `${pairName}, ${symbol0} AmountIn: ${amount0In}, AmountOut: ${amount0Out}; ${symbol1} AmountIn: ${amount1In}, AmountOut: ${amount1Out}; Trading Volume: ${volume0}`
    //     })
    //     //counter n gauge
    //     tradingVolume_gauge.record(ctx, volume0, { pairName: pairName })
    //     ctx.meter.Counter('tradingVolume_counter').add(volume0, { pairName: pairName })
    //   }
    // }
    // catch (e) {
    //   if (e instanceof Error) {
    //     console.log(e.message)
    //     console.log("catch get price error " + symbol0 + " " + symbol1)
    //   }
    // }


    ctx.eventLogger.emit("SwapEvent", {
      distinctId: event.args.sender,
      to: event.args.to,
      amount0In: event.args.amount0In,
      amount0Out: event.args.amount0Out,
      amount1In: event.args.amount1In,
      amount1Out: event.args.amount1Out
    })
  }
  )
