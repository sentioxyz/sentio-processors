import { EthContext } from "@sentio/sdk/eth";
import { GlobalState } from "./schema/store.js";
import { storeGet, storeUpsert } from "./store_utils.js";
import { CErc20UpgradableContext } from "./types/eth/cerc20upgradable.js";

const GLOBAL_STATE_ID = "latest";

export async function getGlobalState(ctx: CErc20UpgradableContext) {
  return (
    (await storeGet(ctx, GlobalState, GLOBAL_STATE_ID)) ??
    new GlobalState({
      id: GLOBAL_STATE_ID,
      network: ctx.chainId.toString(),
      totalPositiveNetBalance: 0n,
      totalSupply: await ctx.contract.totalSupply(),
      totalBorrow: await ctx.contract.totalBorrows(),
      exchangeRateRaw: await ctx.contract.exchangeRateStored(),
    })
  );
}

export async function setGlobalState(ctx: EthContext, state: GlobalState) {
  state.id = GLOBAL_STATE_ID;
  return storeUpsert(ctx, state);
}
