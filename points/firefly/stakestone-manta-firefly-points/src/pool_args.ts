import { EthContext } from "@sentio/sdk/eth";
import { PoolArgs } from "./schema/store.js";

export async function getPoolArgs(ctx: EthContext, poolAddress: string) {
  return await ctx.store.get(PoolArgs, poolAddress.toLowerCase());
}

export async function updatePoolArgs(
  ctx: EthContext,
  poolAddress: string,
  args: {
    liquidity: bigint;
    sqrtPriceX96: bigint;
    tick: bigint;
  }
) {
  await ctx.store.upsert(new PoolArgs({
    id: poolAddress.toLowerCase(),
    ...args
  }));
}
