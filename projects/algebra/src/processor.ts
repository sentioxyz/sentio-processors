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
import { BentoBoxV1Processor } from "./types/eth/bentoboxv1.js";
import { PairProcessor } from "./types/eth/pair.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";

// a constant string array
const ALGEBRA_ADDRESSES = [
  "0x8e3748127e04120Cb19fAD5FC8aB97616FF8db34",
  "0x44107483B0C54eC8Db71EaF4AA22B2ffff7F2750",
];

const START_BLOCK = 51082140;

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

const PAIR_ADDRESSES = ["0xD17cb0f162f133e339C0BbFc18c36c357E681D6b"];
for (const address of PAIR_ADDRESSES) {
  PairProcessor.bind({
    address: address,
    network: EthChainId.POLYGON,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("PairSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

const V3_ADDRESSES = ["0x5834dAC4259422A442b17475c842663F23dFB89d"];

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

const V2_ADDRESSES = ["0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3"];

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
  "0x3b04998f72951a39899eF510Dc16a29B2802b3ac",
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

const BENTO_BOX = "0x0319000133d3AdA02600f0875d2cf03D442C3367";

BentoBoxV1Processor.bind({
  address: BENTO_BOX,
  network: EthChainId.POLYGON,
  startBlock: START_BLOCK,
}).onEvent(async (evt, ctx) => {
  ctx.eventLogger.emit("BentoBoxV1", {
    name: evt.name,
  });
});

ERC20Processor.bind({
  address: "0x946A9fd5f3c7f779A7dC869E03Ac4250082f6dE0",
  network: EthChainId.POLYGON,
  startBlock: START_BLOCK,
}).onEvent(async (evt, ctx) => {
  ctx.eventLogger.emit("ERC20EVT", {
    name: evt.name,
  });
});
