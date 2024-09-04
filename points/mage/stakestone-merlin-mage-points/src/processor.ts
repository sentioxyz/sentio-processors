// @ts-nocheck
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";

import { AccountSnapshot } from "./schema/store.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  EXCHANGE_RATE_DECIMALS,
  NETWORK,
  MAGE_MSTONE_ADDRESS,
  STONE_DECIMALS,
} from "./config.js";
import {
  CErc20ImmutableContext,
  CErc20ImmutableProcessor,
} from "./types/eth/cerc20immutable.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

CErc20ImmutableProcessor.bind({
  network: NETWORK,
  address: MAGE_MSTONE_ADDRESS,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    const newSnapshots = await Promise.all(
      accounts.map((account) =>
        processAccount(ctx, account, undefined, event.name)
      )
    );
    await storeUpsert(ctx, newSnapshots);
  })
  .onEventBorrow(async (event, ctx) => {
    const newSnapshot = await processAccount(
      ctx,
      event.args.borrower,
      undefined,
      event.name
    );
    await storeUpsert(ctx, newSnapshot);
  })
  .onEventRepayBorrow(async (event, ctx) => {
    const newSnapshot = await processAccount(
      ctx,
      event.args.borrower,
      undefined,
      event.name
    );
    await storeUpsert(ctx, newSnapshot);
  })
  .onTimeInterval(
    async (_, ctx) => {
      await updateAll(ctx, "TimeInterval");
    },
    4 * 60,
    24 * 60
  )
  .onTimeInterval(
    async (_, ctx) => {
      const ratio = await getEigenRatio(ctx);
      if (ratio.timestampMilli == lastEigenRatioTimestamp) {
        return;
      }
      await updateAll(ctx, "EigenRatioUpdate");
      lastEigenRatioTimestamp = ratio.timestampMilli;
    },
    30,
    30
  );

async function updateAll(ctx: CErc20ImmutableContext, triggerEvent: string) {
  const snapshots = await storeListAll(ctx, AccountSnapshot);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      processAccount(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await storeUpsert(ctx, newSnapshots);
}

async function getAccountSnapshot(
  ctx: CErc20ImmutableContext,
  account: string,
  timestampMilli: number,
  blockNumber?: number
) {
  const overrides = blockNumber ? { blockTag: blockNumber } : undefined;
  const [
    rStoneBalance,
    borrowStoneBalance,
    exchangeRateRaw,
    totalBorrow,
    totalSupply,
  ] = await Promise.all([
    ctx.contract.balanceOf(account, overrides),
    ctx.contract.borrowBalanceStored(account, overrides),
    ctx.contract.exchangeRateStored(overrides),
    ctx.contract.totalBorrows(overrides),
    ctx.contract.totalSupply(overrides),
  ]);

  const stoneBalance = BigInt(
    (rStoneBalance * exchangeRateRaw)
      .scaleDown(EXCHANGE_RATE_DECIMALS)
      .toFixed(0)
  );
  let balance = 0n;
  if (stoneBalance > borrowStoneBalance) {
    balance = stoneBalance - borrowStoneBalance;
  }

  return new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(timestampMilli),
    balance,
    totalBorrow,
    totalSupply,
    exchangeRateRaw,
  });
}

async function processAccount(
  ctx: CErc20ImmutableContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await storeGet(ctx, AccountSnapshot, account);
  }
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(
    ctx,
    account,
    ctx.timestamp.getTime()
  );
  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotBalance: snapshot?.balance ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calcPoints(
  ctx: CErc20ImmutableContext,
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

  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const totalSupplyStone = (
    accountSnapshot.totalSupply * accountSnapshot.exchangeRateRaw
  ).scaleDown(EXCHANGE_RATE_DECIMALS);
  const ratio = totalSupplyStone
    .minus(accountSnapshot.totalBorrow.asBigDecimal())
    .div(totalSupplyStone);

  const points = accountSnapshot.balance
    .scaleDown(STONE_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(ratio)
    .multipliedBy(deltaHour);

  return points;
}
