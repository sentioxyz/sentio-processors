import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { PancakePairProcessor } from "./types/eth/pancakepair.js";
import { PancakeV3PoolProcessor } from "./types/eth/pancakev3pool.js";
import { AlgebraPoolProcessor } from "./types/eth/algebrapool.js";
import { EthChainId } from "@sentio/sdk/eth";

const START_BLOCK = 32485968;

const V2_ADDRESSES = [
  "0x4c85aace702587c977e1372d44a12addfb6f3402",
  "0xdac44d168c3c050c47b0d9bb067aabfd7497751f",
  "0x4e7ae8129311f3670964cd58da28de56d4eeff41",
];

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

const V3_ADDRESSES = [
  "0x0f338Ec12d3f7C3D77A4B9fcC1f95F3FB6AD0EA6",
  "0x7d05c84581f0C41AD80ddf677A510360bae09a5A",
];

for (const address of V3_ADDRESSES) {
  PancakeV3PoolProcessor.bind({
    address: address,
    network: EthChainId.BINANCE,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V3SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const ALGEBRA_ADDRESSES = ["0xD6f0Ba7eC72Ff3974B02c18ED1fC33Da77434d41"];

for (const address of ALGEBRA_ADDRESSES) {
  AlgebraPoolProcessor.bind({
    address: address,
    network: EthChainId.BINANCE,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("AlgebraSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
