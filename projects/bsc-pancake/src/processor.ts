import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { PancakePairProcessor } from "./types/eth/pancakepair.js";
import { EthChainId } from "@sentio/sdk/eth";

const V2_ADDRESSES = [
  "0x4c85aace702587c977e1372d44a12addfb6f3402",
  "0xdac44d168c3c050c47b0d9bb067aabfd7497751f",
  "0x4e7ae8129311f3670964cd58da28de56d4eeff41",
];

const START_BLOCK = 32446499;

for (const address of V2_ADDRESSES) {
  PancakePairProcessor.bind({
    address: address,
    network: EthChainId.BINANCE,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V2SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
