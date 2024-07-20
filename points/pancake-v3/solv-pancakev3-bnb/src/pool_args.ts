import { EthContext } from "@sentio/sdk/eth"
import { PoolArgs } from "./schema/store.js"

const ID = "pool_args"

export async function getPoolArgs(ctx: EthContext) {
  return await ctx.store.get(PoolArgs, ID)
}

export async function updatePoolArgs(
  ctx: EthContext,
  args: {
    liquidity: bigint
    sqrtPriceX96: bigint
    tick: bigint
  }
) {
  await ctx.store.upsert(new PoolArgs({
    id: ID,
    ...args
  }))
}
