import { EthContext } from "@sentio/sdk/eth";
import { GlobalState } from "./schema/store.js";
import { storeGet, storeUpsert } from "./store_utils.js";
import { getConfig } from "./config.js";
import { getATokenContractOnContext } from "./types/eth/atoken.js";
import { getVariableDebtTokenContractOnContext } from "./types/eth/variabledebttoken.js";

const GLOBAL_STATE_ID = "latest";

export async function getGlobalState(ctx: EthContext) {
  const conf = getConfig(ctx.chainId)!;
  return (
    (await storeGet(ctx, GlobalState, GLOBAL_STATE_ID)) ??
    new GlobalState({
      id: GLOBAL_STATE_ID,
      totalPositiveNetBalance: 0n,
      totalSupply: await getATokenContractOnContext(
        ctx,
        conf.aTokenAddress
      ).totalSupply(),
      totalBorrow: conf.debtTokenAddress
        ? await getVariableDebtTokenContractOnContext(
            ctx,
            conf.debtTokenAddress
          ).totalSupply()
        : 0n,
    })
  );
}

export async function setGlobalState(ctx: EthContext, state: GlobalState) {
  state.id = GLOBAL_STATE_ID;
  return storeUpsert(ctx, state);
}
