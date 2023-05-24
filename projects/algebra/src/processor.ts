import { Counter, Gauge, EthChainId } from "@sentio/sdk";
import { CHAIN_MAP } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  AlgebraPoolContext,
  AlgebraPoolProcessor,
  SwapEvent,
} from "./types/eth/algebrapool.js";

AlgebraPoolProcessor.bind({
  address: "0x65c30F39B880BDD9616280450C4b41cC74B438b7",
  network: EthChainId.POLYGON,
}).onEventSwap(async (evt: SwapEvent, ctx: AlgebraPoolContext) => {
  ctx.eventLogger.emit("SwapEvent", {
    sender: evt.args.sender,
    recipient: evt.args.recipient,
  });
});
