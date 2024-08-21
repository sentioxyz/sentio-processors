import { EthContext } from "@sentio/sdk/eth";
import { GlobalState } from "./schema/store.js";

const GLOBAL_STATE_ID = "latest";

export async function getGlobalState(ctx: EthContext) {
  return (
    (await ctx.store.get(GlobalState, GLOBAL_STATE_ID)) ??
    new GlobalState({
      id: GLOBAL_STATE_ID,
      lpTotalSupply: 0n,
      totalStoneBalance: 0n,
    })
  );
}

export async function setGlobalState(ctx: EthContext, state: GlobalState) {
  state.id = GLOBAL_STATE_ID;
  return ctx.store.upsert(state);
}
