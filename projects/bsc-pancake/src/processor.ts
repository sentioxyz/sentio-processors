import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { PancakePairProcessor } from "./types/eth/pancakepair.js";
import { PancakeV3PoolProcessor } from "./types/eth/pancakev3pool.js";
import { AlgebraPoolProcessor } from "./types/eth/algebrapool.js";
import { EthChainId } from "@sentio/sdk/eth";

const START_BLOCK = 33268168;

const V2_ADDRESSES = [
  "0xba5Ae86960FE468fF02d83022c0079670BD8F6a9",
  "0x183ebd9f9CD444f654d5A46f3FE583542B8948e9",
];

for (const address of V2_ADDRESSES) {
  PancakePairProcessor.bind({
    address: address,
    network: EthChainId.BSC,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V2SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const V3_ADDRESSES = ["0x77d5b2560e4B84b3fC58875Cb0133F39560e8AE3"];

for (const address of V3_ADDRESSES) {
  PancakeV3PoolProcessor.bind({
    address: address,
    network: EthChainId.BSC,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V3SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const ALGEBRA_ADDRESSES = [
  "0x2F6C6e00E517944EE5EFE310cd0b98A3fC61Cb98",
  "0x0748fb34bcb68d2c055cDfCb9F5bcB3549FcB456",
];

for (const address of ALGEBRA_ADDRESSES) {
  AlgebraPoolProcessor.bind({
    address: address,
    network: EthChainId.BSC,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("AlgebraSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
