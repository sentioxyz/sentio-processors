import { Counter, Gauge, EthChainId } from "@sentio/sdk";

import {
  AlgebraPoolContext,
  AlgebraPoolProcessor,
  SwapEvent,
} from "./types/eth/algebrapool.js";
import {
  UniswapV3PoolContext,
  UniswapV3PoolProcessor,
} from "./types/eth/uniswapv3pool.js";

import {
  UniswapV2PairProcessor,
  UniswapV2PairContext,
} from "./types/eth/uniswapv2pair.js";

import {
  ConstantProductPoolProcessor,
  ConstantProductPoolContext,
} from "./types/eth/constantproductpool.js";

import { DystPairProcessor } from "./types/eth/dystpair.js";

// a constant string array
const ALGEBRA_ADDRESSES = ["0x7b925e617aefd7fb3a93abe3a701135d7a1ba710"];

const START_BLOCK = 43266060;

for (const address of ALGEBRA_ADDRESSES) {
  AlgebraPoolProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt: SwapEvent, ctx: AlgebraPoolContext) => {
    ctx.eventLogger.emit("AlgebraSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const V3_ADDRESSES = ["0x9b08288c3be4f62bbf8d1c20ac9c5e6f9467d8b7"];

for (const address of V3_ADDRESSES) {
  UniswapV3PoolProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V3SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const V2_ADDRESSES = [
  "0x2ff463fee34a15dc2fce02209ae65c6bfc9a96dc",
  "0xc1e49d1afacc0da4ff74a9a1ea7b2469dffc5659",
];

for (const address of V2_ADDRESSES) {
  UniswapV2PairProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("V2SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const CONSTANT_PRODUCT_ADDRESSES = [
  "0xd0266A51c4FA3E07beD30639Be7cfAE4F6080Bc3",
];

for (const address of CONSTANT_PRODUCT_ADDRESSES) {
  ConstantProductPoolProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("ConstantProductSwapEvent", {
      sender: evt.args.recipient,
      index: evt.transactionIndex,
    });
  });
}

const DYS_ADDRESSES = ["0xC9e4a017ae5c2F89C085c534A38a3e6d3A183A43"];

for (const address of DYS_ADDRESSES) {
  DystPairProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("DystSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
