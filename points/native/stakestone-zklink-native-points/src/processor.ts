import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";

import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  AquaLpTokenContext,
  AquaLpTokenProcessor,
} from "./types/eth/aqualptoken.js";
import {
  NETWORK,
  AQUA_LP_STONE,
  EXCHANGE_RATE_DECIMALS,
  STONE_DECIMALS,
} from "./config.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

AquaLpTokenProcessor.bind({
  network: NETWORK,
  address: AQUA_LP_STONE,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    const newSnapshots = await Promise.all(
      accounts.map((account) =>
        processAccount(ctx, account, undefined, event.name)
      )
    );
    await ctx.store.upsert(newSnapshots);
  })
  .onEventBorrow(async (event, ctx) => {
    const newSnapshot = await processAccount(
      ctx,
      event.args.borrower,
      undefined,
      event.name
    );
    await ctx.store.upsert(newSnapshot);
  })
  .onEventRepayBorrow(async (event, ctx) => {
    const newSnapshot = await processAccount(
      ctx,
      event.args.borrower,
      undefined,
      event.name
    );
    await ctx.store.upsert(newSnapshot);
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

async function updateAll(ctx: AquaLpTokenContext, triggerEvent: string) {
  const snapshots = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      processAccount(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots);
}

async function getAccountSnapshot(
  ctx: AquaLpTokenContext,
  account: string,
  timestampMilli: number,
  blockNumber?: number
) {
  const overrides = blockNumber ? { blockTag: blockNumber } : undefined;
  const [
    seStoneBalance,
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
    (seStoneBalance * exchangeRateRaw)
      .scaleDown(EXCHANGE_RATE_DECIMALS)
      .toFixed(0)
  );
  let balance = 0n;
  if (stoneBalance > borrowStoneBalance) {
    balance = stoneBalance - borrowStoneBalance;
  }

  return new AccountSnapshot({
    id: account,
    network: ctx.chainId.toString(),
    timestampMilli: BigInt(timestampMilli),
    balance,
    totalBorrow,
    totalSupply,
    exchangeRateRaw,
  });
}

async function processAccount(
  ctx: AquaLpTokenContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
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
  ctx: AquaLpTokenContext,
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
