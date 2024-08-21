import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import { AVALON_MSTONE_ADDRESS, NETWORK } from "./config.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

ERC20Processor.bind({
  network: NETWORK,
  address: AVALON_MSTONE_ADDRESS,
})
  .onEventTransfer(async (event, ctx) => {
    const newSnapshots = await Promise.all(
      [event.args.from, event.args.to]
        .filter((account) => !isNullAddress(account))
        .map((account) => process(ctx, account, undefined, event.name))
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

async function updateAll(ctx: ERC20Context, triggerEvent: string) {
  const snapshots = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      process(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots);
}

async function process(
  ctx: ERC20Context,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }
  const snapshotTimestampMilli = snapshot?.timestampMilli ?? 0n;
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = await calcPoints(ctx, snapshotTimestampMilli, snapshotBalance);

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const newBalance = await ctx.contract.balanceOf(account);
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

async function calcPoints(
  ctx: EthContext,
  snapshotTimestampMilli: bigint,
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
