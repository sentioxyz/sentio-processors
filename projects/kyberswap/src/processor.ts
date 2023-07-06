import {
  KSFactoryContext,
  KSFactoryProcessor,
  PoolCreatedEvent,
} from "./types/eth/ksfactory.js";
import { EthChainId } from "@sentio/sdk/eth";

import {
  KSRouter02Context,
  KSRouter02Processor,
  SwapExactTokensForTokensCallTrace,
} from "./types/eth/ksrouter02.js";

/*
const handlePoolCreated = async (
  event: PoolCreatedEvent,
  ctx: KSFactoryContext
) => {
  ctx.eventLogger.emit("pool", {
    distinctId: event.args.pool,
    amp: event.args.ampBps,
  });
};

KSFactoryProcessor.bind({
  address: "0x1c758aF0688502e49140230F6b0EBd376d429be5",
  network: EthChainId.POLYGON,
}).onEventPoolCreated(handlePoolCreated);
*/

const handleSwapCall = async (
  call: SwapExactTokensForTokensCallTrace,
  ctx: KSRouter02Context
) => {
  if (call.error) {
    return;
  }
  ctx.eventLogger.emit("call", {
    distinctId: call.args.to,
  });
};

KSRouter02Processor.bind({
  address: "0x5649B4DD00780e99Bab7Abb4A3d581Ea1aEB23D0",
  network: EthChainId.POLYGON,
  startBlock: 44000000,
}).onCallSwapExactTokensForTokens(handleSwapCall);
