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
const ALGEBRA_ADDRESSES = [
  "0x7b925e617aefd7fb3a93abe3a701135d7a1ba710",
  "0x5b41eedcfc8e0ae47493d4945aa1ae4fe05430ff",
  "0x384d2094D0Df788192043a1CBd200308DD60b068",
  "0x5d1e23160ED81F33dfaE40Ed72dd4377c198ddAf",
];

const START_BLOCK = 43099700;

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

const V3_ADDRESSES = [
  "0xefa98fdf168f372e5e9e9b910fcdfd65856f3986",
  "0x45dda9cb7c25131df268515131f647d726f50608",
];

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
  "0x4B1F1e2435A9C96f7330FAea190Ef6A7C8D70001",
  "0x34965ba0ac2451a34a0471f04cca3f990b8dea27",
  "0xcd279eb30046f0efafee57a0fa898c1f70d26529",
  "0xadbF1854e5883eB8aa7BAf50705338739e558E5b",
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

const QUICK_ADDRESSES = ["0x8b80417D92571720949fC22404200AB8FAf7775f"];
for (const address of QUICK_ADDRESSES) {
  UniswapV2PairProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("QuickSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
