import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  X3CoinStakingContext,
  X3CoinStakingProcessor,
} from "./types/eth/x3coinstaking.js";
import { getEigenRatio } from "./eigen_ratio.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const AllienXAddress = "0x0B159aAcd4A93977a34928C417fCA3A2f3a40d1B";
const CSTONE_ADDRESS = "0x4d831e22f062b5327dfdb15f0b6a5df20e2e3dd0";

let lastEigenRatioTimestamp: number | undefined = undefined;

X3CoinStakingProcessor.bind({
  address: AllienXAddress,
  network: EthChainId.ETHEREUM,
})
  .onEventDeposited(
    async (event, ctx) => {
      const newSnapshot = await process(
        ctx,
        event.args.userAddress,
        event.name
      );
      await ctx.store.upsert(newSnapshot);
    },
    X3CoinStakingProcessor.filters.Deposited(undefined, CSTONE_ADDRESS)
  )
  .onEventWithdrawn(
    async (event, ctx) => {
      const newSnapshot = await process(
        ctx,
        event.args.userAddress,
        event.name
      );
      await ctx.store.upsert(newSnapshot);
    },
    X3CoinStakingProcessor.filters.Withdrawn(undefined, CSTONE_ADDRESS)
  )
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

async function updateAll(ctx: X3CoinStakingContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    accounts.map((account) => process(ctx, account.id.toString(), triggerEvent))
  );
  await ctx.store.upsert(newSnapshots);
}

async function process(
  ctx: X3CoinStakingContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotBalance
  );

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const newBalance = await ctx.contract.balanceOf(account, CSTONE_ADDRESS);
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
    balance: newBalance,
  });

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotBalance,
    newTimestampMilli,
    newBalance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calculatePoints(
  ctx: X3CoinStakingContext,
  snapshotTimestampMilli: number,
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
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
