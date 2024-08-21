import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  ORAStakingPoolContext,
  ORAStakingPoolProcessor,
} from "./types/eth/orastakingpool.js";

const lotSTONE = "0xc0b2fda4edb0f7995651b05b179596b112abe0ff";
const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

ORAStakingPoolProcessor.bind({
  address: lotSTONE,
  network: EthChainId.ETHEREUM,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    const newSnapshots = await Promise.all(
      accounts.map((account) => process(ctx, account, event.name))
    );
    await ctx.store.upsert(newSnapshots);
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

async function updateAll(ctx: ORAStakingPoolContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    accounts.map((account) => process(ctx, account.id.toString(), triggerEvent))
  );
  await ctx.store.upsert(newSnapshots);
}

async function process(
  ctx: ORAStakingPoolContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotStoneBalance = snapshot?.stoneBalance ?? 0n;
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotStoneBalance
  );

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const newStoneBalance = await ctx.contract.balanceOfAsset(account);
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
  ctx: ORAStakingPoolContext,
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
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotStoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
