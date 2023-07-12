import { Counter, Gauge } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";

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
import { ApePairProcessor } from "./types/eth/apepair.js";

import { RouterImplProcessor } from "./types/eth/routerimpl.js";

// a constant string array
const ALGEBRA_ADDRESSES = ["0x80deece4befd9f27d2df88064cf75f080d3ce1b2"];

// target tx is 0xc988bfb51d44f6e5162e6a860a9aa75f7fd087f7e1b816f7a50d422bcbe6e712
const START_BLOCK = 44980460;

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

const APE_ADDRESSES = ["0x5b13b583d4317ab15186ed660a1e4c65c10da659"];

for (const address of APE_ADDRESSES) {
  ApePairProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("ApeSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const V3_ADDRESSES = ["0x86f1d8390222a3691c28938ec7404a1661e618e0"];

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

const V2_ADDRESSES = ["0xccb9d2100037f1253e6c1682adf7dc9944498aff"];

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

const DYS_ADDRESSES = [
  "0x6f2fed287e47590b7702f9d331344c7dacbacfe5",
  "0x1a5feba5d5846b3b840312bd04d76ddaa6220170",
];

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

const MESHSWAP_ROUTER = "0x10f4A785F458Bc144e3706575924889954946639";

RouterImplProcessor.bind({
  address: MESHSWAP_ROUTER,
  network: EthChainId.POLYGON,
  startBlock: START_BLOCK,
})
  .onEventExchangePos(async (evt, ctx) => {
    ctx.eventLogger.emit("exchangePos", {
      token0: evt.args.token0,
      token1: evt.args.token1,
    });
  })
  .onEventExchangeNeg(async (evt, ctx) => {
    ctx.eventLogger.emit("exchangeNeg", {
      token0: evt.args.token0,
      token1: evt.args.token1,
    });
  });
