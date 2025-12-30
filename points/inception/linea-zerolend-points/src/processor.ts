import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import { ATokenContext, ATokenProcessor } from "./types/eth/atoken.js";
import { AccountSnapshot } from "./schema/store.js";
import { ATOKEN_ADDRESS, NETWORK } from "./config.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

ATokenProcessor.bind({
  address: ATOKEN_ADDRESS,
  network: NETWORK,
})
  .onEventMint(async (event, ctx) => {
    const newSnapshot = await process(
      ctx,
      event.args.onBehalfOf,
      undefined,
      event.name
    );
    await ctx.store.upsert(newSnapshot);
  })
  .onEventBurn(async (event, ctx) => {
    const newSnapshot = await process(
      ctx,
      event.args.from,
      undefined,
      event.name
    );
    await ctx.store.upsert(newSnapshot);
  })
  .onEventBalanceTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    const newSnapshots = await Promise.all(
      accounts.map((account) => process(ctx, account, undefined, event.name))
    );
    await ctx.store.upsert(newSnapshots);
  })
  .onTimeInterval(
    async (_, ctx) => {
      const snapshots = await ctx.store.list(AccountSnapshot, []);
      const newSnapshots = await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.id.toString(), snapshot, "TimeInterval")
        )
      );
      await ctx.store.upsert(newSnapshots);
    },
    4 * 60,
    24 * 60
  );

async function getAccountSnapshot(
  ctx: ATokenContext,
  account: string,
  timestampMilli: number,
  blockNumber?: number
) {
  const overrides = blockNumber ? { blockTag: blockNumber } : undefined;
  return new AccountSnapshot({
    id: account,
    network: ctx.chainId.toString(),
    timestampMilli: BigInt(timestampMilli),
    balance: await ctx.contract.balanceOf(account, overrides),
  });
}

async function process(
  ctx: ATokenContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }

  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = snapshot
    ? await calculatePoints(ctx, snapshot.timestampMilli, snapshotBalance)
    : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(
    ctx,
    account,
    ctx.timestamp.getTime()
  );

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotBalance,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calculatePoints(
  ctx: ATokenContext,
  snapshotTimestampMilli: BigInt,
  snapshotBalance: bigint
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshotTimestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaHour);

  return points;
}
