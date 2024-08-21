import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";

import { AccountSnapshot, GlobalState } from "./schema/store.js";
import { STONE_DECIMALS, configs } from "./config.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  SeBep20DelegatorContext,
  SeBep20DelegatorProcessor,
} from "./types/eth/sebep20delegator.js";
import { getAccountBalance, updateGlobalState } from "./state.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((config) =>
  SeBep20DelegatorProcessor.bind({
    network: config.network,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const { from, to } = event.args;
      const accounts = [from, to].filter((account) => !isNullAddress(account));
      await updateAccounts(ctx, accounts, event.name);
    })
    .onEventBorrow(async (event, ctx) => {
      await updateAccounts(ctx, [event.args.borrower], event.name);
    })
    .onEventRepayBorrow(async (event, ctx) => {
      await updateAccounts(ctx, [event.args.borrower], event.name);
    })
    .onTimeInterval(
      async (_, ctx) => {
        await updateAccounts(ctx, [], "TimeInterval");
      },
      4 * 60,
      24 * 60
    )
    .onTimeInterval(
      async (_, ctx) => {
        const ratio = await getEigenRatio(ctx);
        const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
        if (ratio.timestampMilli == las) {
          return;
        }
        await updateAccounts(ctx, [], "EigenRatioUpdate");
        lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
          ratio.timestampMilli;
      },
      30,
      30
    )
);

async function updateAccounts(
  ctx: SeBep20DelegatorContext,
  eventAccounts: string[],
  triggerEvent: string
) {
  const state = await updateGlobalState(ctx, eventAccounts);
  const snapshots = await storeListAll(ctx, AccountSnapshot, [
    {
      field: "netBalance",
      op: ">",
      value: 0n,
    },
  ]);
  const snapshotMap = Object.fromEntries(
    snapshots.map((snapshot) => [snapshot.id.toString(), snapshot])
  );
  eventAccounts.forEach((account) => {
    snapshotMap[account] = snapshotMap[account] ?? undefined;
  });
  const newSnapshots = await Promise.all(
    Object.entries(snapshotMap).map(([account, snapshot]) =>
      processAccount(ctx, state, account, snapshot, triggerEvent)
    )
  );
  await storeUpsert(ctx, newSnapshots);
}

async function processAccount(
  ctx: SeBep20DelegatorContext,
  state: { old: GlobalState; new: GlobalState },
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await storeGet(ctx, AccountSnapshot, account);
  }
  const points = snapshot
    ? await calcPoints(ctx, state.old, snapshot)
    : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(
    ctx,
    account,
    ctx.timestamp.getTime()
  );
  ctx.eventLogger.emit("point_update", {
    account,
    points,
    triggerEvent,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotBalance: snapshot?.balance ?? 0,
    snapshotBorrowBalance: snapshot?.borrowBalance ?? 0,
    snapshotNetBalance: snapshot?.netBalance ?? 0,
    snapshotTotalSupply: state.old.totalSupply,
    snapshotTotalBorrow: state.old.totalBorrow,
    snapshotTotalPositiveNetBalance: state.old.totalPositiveNetBalance,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    newBorrowBalance: newSnapshot.borrowBalance,
    newNetBalance: newSnapshot.netBalance,
    newTotalSupply: state.new.totalSupply,
    newTotalBorrow: state.new.totalBorrow,
    newTotalPositiveNetBalance: state.new.totalPositiveNetBalance,
  });
  return newSnapshot;
}

async function calcPoints(
  ctx: SeBep20DelegatorContext,
  state: GlobalState,
  accountSnapshot: AccountSnapshot
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  if (nowMilli < Number(accountSnapshot.timestampMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      accountSnapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == Number(accountSnapshot.timestampMilli)) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }

  if (accountSnapshot.netBalance <= 0) {
    return new BigDecimal(0);
  }

  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const points = (
    (state.totalSupply - state.totalBorrow) *
    accountSnapshot.netBalance
  )
    .scaleDown(STONE_DECIMALS)
    .div(state.totalPositiveNetBalance.asBigDecimal())
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}

async function getAccountSnapshot(
  ctx: SeBep20DelegatorContext,
  account: string,
  timestampMilli: number
) {
  const { balance, borrowBalance, netBalance, exchangeRateRaw } =
    await getAccountBalance(ctx, account);
  return new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(timestampMilli),
    balance,
    borrowBalance,
    netBalance,
    exchangeRateRaw,
  });
}
