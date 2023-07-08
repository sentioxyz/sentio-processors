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
const ALGEBRA_ADDRESSES = ["0x9ceff2f5138fc59eb925d270b8a7a9c02a1810f2"];

const START_BLOCK = 44753480;

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

const V3_ADDRESSES = [
  "0xca4c5a5d1988be88c33208001e4ef7ea3898404f",
  "0xd438e4da60a786d78b793f2c834b843673145f2e",
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
  "0x93ef405225ad5c7be2ba115617611dece2a68a97",
  "0x43f8b2bb5b24a339d9eec2ea8889d33d189ac217",
  "0xbe40f7fff5a2235af9a8cb79a17373162efefa9c",
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
