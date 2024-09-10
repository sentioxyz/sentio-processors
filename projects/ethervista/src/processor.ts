import { EthChainId } from "@sentio/sdk/eth";
import { EtherVistaFactoryProcessor } from "./types/eth/ethervistafactory.js";
import { getOrCreatePair } from "./helper/helper.js";
import { EtherVistaPairProcessor, EtherVistaPairProcessorTemplate } from "./types/eth/ethervistapair.js";

const ETHERVISTA_FACTORY = "0x9a27cb5ae0b2cee0bb71f9a85c0d60f3920757b4"


EtherVistaFactoryProcessor.bind({
  network: EthChainId.ETHEREUM,
  address: ETHERVISTA_FACTORY
})
  .onEventPairCreated(async (event, ctx) => {
    const pairInfo = await getOrCreatePair(ctx, event.args.pair)

    ctx.eventLogger.emit("PairCreated", {
      ...pairInfo,
      token0: event.args.token0,
      token1: event.args.token1,
      pair: event.args.pair,
      arg3: event.args.arg3,
      distinctId: ctx.transaction?.from,
    })

    // pairTemplate.bind({ address: event.args.pair, startBlock: ctx.blockNumber }, ctx)

  })


// const pairTemplate = new EtherVistaPairProcessorTemplate()
//   .onEventSwap(async (event, ctx) => {
//     const pairInfo = await getOrCreatePair(ctx, ctx.address)

//     ctx.eventLogger.emit("Swap", {
//       ...pairInfo,
//       distinctId: event.args.sender,
//       sender: event.args.sender,
//       amount0In: event.args.amount0In,
//       amount1In: event.args.amount1In,
//       amount0Out: event.args.amount0Out,
//       amount1Out: event.args.amount1Out,
//       to: event.args.to,
//     })

//   })

