
import { BigDecimal, Gauge } from "@sentio/sdk"
import { EthChainId } from "@sentio/sdk/eth";
import { getPriceByType, token } from "@sentio/sdk/utils"
import { ERC20Context, ERC20Processor, getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";

import { CORE_POOLS_V3 } from "./constant.js";
import { getOrCreatePool } from "./processor.js"
import { ContractContext, EthContext, TypedCallTrace } from "@sentio/sdk/eth";

import { SwapEvent, V3PoolContext, V3PoolProcessor } from "./types/eth/v3pool.js";



for (let i = 0; i < CORE_POOLS_V3.length; i++) {
  const pool = CORE_POOLS_V3[i]
  V3PoolProcessor.bind({
    address: pool,
    network: EthChainId.CRONOS
  })
    .onEventSwap(async (event: SwapEvent, ctx: V3PoolContext) => {
      const poolInfo = await getOrCreatePool(ctx, "v3")

      ctx.eventLogger.emit("V3PoolSwap", {
        sender: event.args.sender,
        recipient: event.args.recipient,
        amount0: Number(event.args.amount0) / 10 ** poolInfo.token0.decimal,
        amount1: Number(event.args.amount1) / 10 ** poolInfo.token1.decimal,
        sqrtPriceX96: event.args.sqrtPriceX96,
        liquidity: event.args.liquidity,
        tick: event.args.tick,
        protocolFeesToken0: event.args.protocolFeesToken0,
        protocolFeesToken1: event.args.protocolFeesToken1,
        fee: poolInfo.fee,
        pool: ctx.address,
        poolName: poolInfo.poolName
      })
    })
}