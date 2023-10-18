import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { CamelotPairProcessor } from "./types/eth/camelotpair.js";
import { UniswapV3PoolProcessor } from "./types/eth/uniswapv3pool.js";
import { HighCovRatioFeePoolV2Processor } from "./types/eth/highcovratiofeepoolv2.js";
import { EthChainId } from "@sentio/sdk/eth";

const START_BLOCK = 141279590;

// a constant string array
const CAMELOT_ADDRESSES = ["0x68A0859de50B4Dfc6EFEbE981cA906D38Cdb0D1F"];
const UNISWAP_V3_POOL_ADDRESSES = [
  "0x27807dD7ADF218e1f4d885d54eD51C70eFb9dE50",
];
const HIGH_COV_RATIO_FEE_POOL_V2_ADDRESSES = [
  "0x82E62f4e174E3C5e1641Df670c91Ac6Ab8541518",
];

for (const address of CAMELOT_ADDRESSES) {
  CamelotPairProcessor.bind({
    address: address,
    network: EthChainId.ARBITRUM,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("CamelotSwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

for (const address of UNISWAP_V3_POOL_ADDRESSES) {
  UniswapV3PoolProcessor.bind({
    address: address,
    network: EthChainId.ARBITRUM,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("UniswapV3SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}

for (const address of HIGH_COV_RATIO_FEE_POOL_V2_ADDRESSES) {
  HighCovRatioFeePoolV2Processor.bind({
    address: address,
    network: EthChainId.ARBITRUM,
    startBlock: START_BLOCK,
  }).onEventSwap(async (evt, ctx) => {
    ctx.eventLogger.emit("HighCovRatioFeePoolV2SwapEvent", {
      sender: evt.args.sender,
      index: evt.transactionIndex,
    });
  });
}
