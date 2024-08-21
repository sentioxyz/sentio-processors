import { EthContext } from "@sentio/sdk/eth";
import { PoolArgs } from "./schema/store.js";

export async function getPoolArgs(ctx: EthContext, address: string) {
  return await ctx.store.get(PoolArgs, address);
}

export async function updatePoolArgs(
  ctx: EthContext,
  address: string,
  args: {
    liquidity: bigint;
    sqrtPriceX96: bigint;
    tick: bigint;
  }
) {
  await ctx.store.upsert(
    new PoolArgs({
      id: address,
      ...args,
    })
  );
}
