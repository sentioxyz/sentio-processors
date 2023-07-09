import {
  UniswapV2FactoryProcessor,
  UniswapV3FactoryProcessor,
} from "./types/eth/index.js";

UniswapV2FactoryProcessor.bind({
  address: "*",
  startBlock: 10000835,
}).onEventPairCreated((evt, ctx) => {
  if (
    evt.address.toLowerCase() ===
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f".toLowerCase()
  ) {
    return;
  }
  ctx.meter.Counter("pool").add(1, {
    poolType: "UniswapV2",
    factory: evt.address,
  });
});

UniswapV3FactoryProcessor.bind({
  address: "*",
  startBlock: 12369621,
}).onEventPoolCreated((evt, ctx) => {
  if (
    evt.address.toLowerCase() ===
    "0x1F98431c8aD98523631AE4a59f267346ea31F984".toLowerCase()
  ) {
    return;
  }
  ctx.meter.Counter("pool").add(1, {
    poolType: "UniswapV3",
    factory: evt.address,
  });
});
