import { UniswapV2FactoryProcessor , UniswapV3FactoryProcessor} from "./types/eth/index.js";

UniswapV2FactoryProcessor.bind({address: '*', startBlock: 10000835})
    .onEventPairCreated((evt, ctx) => {

      ctx.meter.Counter("pool").add(1, {
        poolType: "UniswapV2",
      })

      ctx.eventLogger.emit("PoolCreated", {
        poolType: "UniswapV2",
        address: evt.args.pair
      })
    })

UniswapV3FactoryProcessor.bind({address: '*', startBlock: 12369621})
    .onEventPoolCreated((evt, ctx) => {
      ctx.meter.Counter("pool").add(1, {
        poolType: "UniswapV3",
      })

      ctx.eventLogger.emit("PoolCreated", {
        poolType: "UniswapV3",
        address: evt.args.pool
      })
    })

//

