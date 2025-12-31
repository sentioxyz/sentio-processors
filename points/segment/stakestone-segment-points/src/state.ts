import { EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot, GlobalState } from "./schema/store.js";
import { storeGet, storeUpsert } from "./store_utils.js";
import { SeBep20DelegatorContext } from "./types/eth/sebep20delegator.js";
import { EXCHANGE_RATE_DECIMALS } from "./config.js";

const GLOBAL_STATE_ID = "latest";

async function getGlobalState(ctx: SeBep20DelegatorContext) {
  return (
    (await storeGet(ctx, GlobalState, GLOBAL_STATE_ID)) ??
    new GlobalState({
      id: GLOBAL_STATE_ID,
      network: ctx.chainId.toString(),
      totalPositiveNetBalance: 0n,
      totalSupply: await ctx.contract.totalSupply(),
      totalBorrow: await ctx.contract.totalBorrows(),
    })
  );
}

async function setGlobalState(ctx: EthContext, state: GlobalState) {
  state.id = GLOBAL_STATE_ID;
  return storeUpsert(ctx, state);
}

export async function updateGlobalState(
  ctx: SeBep20DelegatorContext,
  accounts: string[]
) {
  const oldState = await getGlobalState(ctx);
  const state = new GlobalState(oldState.toJSON());

  const snapshots = await Promise.all(
    accounts.map(
      async (account) =>
        (await storeGet(ctx, AccountSnapshot, account)) ??
        new AccountSnapshot({
          id: account,
          network: ctx.chainId.toString(),
          netBalance: 0n,
          balance: 0n,
          borrowBalance: 0n,
          exchangeRateRaw: 0n,
          timestampMilli: 0n
        })
    )
  );

  for (const snapshot of snapshots) {
    if (snapshot.netBalance > 0n) {
      state.totalPositiveNetBalance -= snapshot.netBalance;
    }
    const account = snapshot.id.toString();
    const { netBalance } = await getAccountBalance(ctx, account);
    if (netBalance > 0n) {
      state.totalPositiveNetBalance += netBalance;
    }
  }
  await setGlobalState(ctx, state);
  return {
    old: oldState,
    new: state,
  };
}

export async function getAccountBalance(
  ctx: SeBep20DelegatorContext,
  account: string
) {
  const [seStoneBalance, borrowStoneBalance, exchangeRateRaw] =
    await Promise.all([
      ctx.contract.balanceOf(account),
      ctx.contract.borrowBalanceStored(account),
      ctx.contract.exchangeRateStored(),
    ]);

  const stoneBalance =
    (seStoneBalance * exchangeRateRaw) / 10n ** BigInt(EXCHANGE_RATE_DECIMALS);
  return {
    balance: stoneBalance,
    borrowBalance: borrowStoneBalance,
    netBalance: stoneBalance - borrowStoneBalance,
    exchangeRateRaw,
  };
}
