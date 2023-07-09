import { UniswapV1FactoryProcessor } from "./types/eth/uniswapv1factory.js";
import { UniswapV2FactoryProcessor } from "./types/eth/uniswapv2factory.js"
import { UniswapV3FactoryProcessor } from "./types/eth/uniswapv3factory.js";
import { EthChainId } from "@sentio/sdk/eth";

// v1
UniswapV1FactoryProcessor.bind({ address: "0xc0a47dfe034b400b47bdad5fecda2621de6c4d95" })
  .onEventNewExchange(async (event, ctx) => {
    ctx.meter.Counter("cumulative_pairs").add(1, { uniswap_version: "v1" });
    ctx.eventLogger.emit("NewExchange", {
      token: event.args.token,
      exchange: event.args.exchange,
      uniswap_version: 1
    })
  })

// v2
UniswapV2FactoryProcessor.bind({ address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" })
  .onEventPairCreated(async (event, ctx) => {
    ctx.meter.Counter("cumulative_pairs").add(1, { uniswap_version: "v2" });
    ctx.eventLogger.emit("PairCreated", {
      token0: event.args.token0,
      token1: event.args.token1,
      pair: event.args.pair,
      uniswap_version: 2
    })
  })

// v3 
UniswapV3FactoryProcessor.bind({ address: "0x1F98431c8aD98523631AE4a59f267346ea31F984" })
  .onEventPoolCreated(async (event, ctx) => {
    ctx.meter.Counter("cumulative_pairs").add(1, { uniswap_version: "v3" });
    ctx.eventLogger.emit("PoolCreatedV2", {
      token0: event.args.token0,
      token1: event.args.token1,
      pool: event.args.pool,
      uniswap_version: 3,
    })
  })
