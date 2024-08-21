import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { configs } from "./config.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((conf) =>
  ERC20Processor.bind({
    address: conf.address,
    network: conf.network,
  })
    .onEventTransfer(async (event, ctx) => {
      const { from, to } = event.args;
      if (from == to) {
        return;
      }
      const accounts = [from, to].filter((account) => !isNullAddress(account));
      const newSnapshots = await Promise.all(
        accounts.map((account) => process(ctx, account, undefined, event.name))
      );
      await storeUpsert(ctx, newSnapshots);
    })
    .onTimeInterval(
      async (_, ctx) => {
        await updateAll(ctx, "TimeInterval");
      },
      4 * 60,
      30 * 24 * 60
    )
    .onTimeInterval(
      async (_, ctx) => {
        const ratio = await getEigenRatio(ctx);
        const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
        if (ratio.timestampMilli == las) {
          return;
        }
        await updateAll(ctx, "EigenRatioUpdate");
        lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
          ratio.timestampMilli;
      },
      30,
      30
    )
);

async function updateAll(ctx: ERC20Context, triggerEvent: string) {
  const snapshots = await storeListAll(ctx, AccountSnapshot);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      process(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await storeUpsert(ctx, newSnapshots);
}

async function process(
  ctx: ERC20Context,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await storeGet(ctx, AccountSnapshot, account);
  }
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotStoneBalance = snapshot?.stoneBalance ?? 0n;
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotStoneBalance
  );

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const newStoneBalance = await ctx.contract.balanceOf(account);
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
    stoneBalance: newStoneBalance,
  });

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotStoneBalance,
    newTimestampMilli,
    newStoneBalance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calculatePoints(
  ctx: ERC20Context,
  snapshotTimestampMilli: number,
  snapshotStoneBalance: bigint
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshotTimestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotStoneBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const eigenRatio = await getEigenRatio(ctx);
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotStoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(eigenRatio.ratio)
    .multipliedBy(deltaHour);

  return points;
}
