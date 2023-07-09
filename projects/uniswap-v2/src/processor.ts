import { UniswapV2FactoryProcessor } from "./types/eth/uniswapv2factory.js"


UniswapV2FactoryProcessor.bind({ address: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' })
  .onEventPairCreated(async (event, ctx) => {
    ctx.meter.Counter("cumulative_pairs").add(1);
    ctx.eventLogger.emit("PairCreated", {
      token0: event.args.token0,
      token1: event.args.token1,
      pair: event.args.pair
    })
  })