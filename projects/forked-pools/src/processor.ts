import { UniswapV2FactoryProcessor , UniswapV3FactoryProcessor} from "./types/eth/index.js";

UniswapV2FactoryProcessor.bind({address: '*', startBlock: 10000835})
    .onEventPairCreated((evt, ctx) => {

      ctx.meter.Counter("pool").add(1, {
        poolType: "UniswapV2",
      })

      ctx.eventLogger.emit("PoolCreated", {
        poolType: "UniswapV2",
        poolAddress: evt.args.pair,
        token0: evt.args.token0,
        token1: evt.args.token1,
      })
    })

UniswapV3FactoryProcessor.bind({address: '*', startBlock: 12369621})
    .onEventPoolCreated((evt, ctx) => {
      ctx.meter.Counter("pool").add(1, {
        poolType: "UniswapV3",
      })

      ctx.eventLogger.emit("PoolCreated", {
        poolType: "UniswapV3",
        poolAddress: evt.args.pool,
        token0: evt.args.token0,
        token1: evt.args.token1,
      })
    })

//

