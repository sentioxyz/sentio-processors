import { CHAIN_IDS, Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { OKCSwapFactoryProcessor } from './types/eth/okcswapfactory.js'

OKCSwapFactoryProcessor.bind({ address: "0x7b9F0a56cA7D20A44f603C03C6f45Db95b31e539", network: CHAIN_IDS.OKEXCHAIN })
  .onEventPairCreated(async (event, ctx) => {
    const token0 = event.args.token0
    const token1 = event.args.token1
    // const pair = event.args.pair

    ctx.eventLogger.emit("PairCreated", {
      token0,
      token1,
      // pair
    })
  })


