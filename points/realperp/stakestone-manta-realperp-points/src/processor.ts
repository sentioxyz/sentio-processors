import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  RlpManagerContext,
  RlpManagerProcessor,
} from "./types/eth/rlpmanager.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const STONE_ADDRESS = "0xec901da9c68e90798bbbb74c11406a32a70652c3";
const RLP_MANAGER_ADDRESS = "0xBBa479D953d012256770e75e2E49aF85F17A574B";

// actually maybe not accurate
RlpManagerProcessor.bind({
  address: RLP_MANAGER_ADDRESS,
  network: EthChainId.MANTA_PACIFIC,
})
  .onEventAddLiquidity(async (event, ctx) => {
    if (event.args.token.toLowerCase() !== STONE_ADDRESS.toLowerCase()) {
      return;
    }
    const newSnapshot = await process(
      ctx,
      event.args.account,
      event.args.amount,
      undefined,
      event.name
    );
    await ctx.store.upsert(newSnapshot);
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    if (event.args.token.toLowerCase() !== STONE_ADDRESS.toLowerCase()) {
      return;
    }
    const newSnapshot = await process(
      ctx,
      event.args.account,
      -event.args.amountOut,
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

async function updateAll(ctx: RlpManagerContext, triggerEvent: string) {
  const snapshots = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      process(ctx, snapshot.id.toString(), 0n, snapshot, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots);
}

async function process(
  ctx: RlpManagerContext,
  account: string,
  balanceDelta: bigint,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = await calcPoints(ctx, snapshotTimestampMilli, snapshotBalance);

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  let newBalance = snapshotBalance + balanceDelta;
  if (newBalance < 0n) {
    newBalance = 0n;
  }
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
