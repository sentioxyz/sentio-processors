import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import { VaultManagerProcessor } from "./types/eth/vaultmanager.js";
import { BorrowerOperationsProcessor } from "./types/eth/borroweroperations.js";
import {
  BORROWER_OPERATIONS_ADDRESS,
  NETWORK,
  VAULT_MANAGER_ADDRESS,
} from "./config.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

VaultManagerProcessor.bind({
  network: NETWORK,
  address: VAULT_MANAGER_ADDRESS,
})
  .onEventVaultUpdated(async (event, ctx) => {
    const newSnapshot = await process(
      ctx,
      event.args._borrower,
      event.args._coll,
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

BorrowerOperationsProcessor.bind({
  network: NETWORK,
  address: BORROWER_OPERATIONS_ADDRESS,
}).onEventVaultUpdated(async (event, ctx) => {
  const newSnapshot = await process(
    ctx,
    event.args._borrower,
    event.args._coll,
    event.name
  );
  await ctx.store.upsert(newSnapshot);
});

async function updateAll(ctx: EthContext, triggerEvent: string) {
  const snapshots = await ctx.store.list(AccountSnapshot, []);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      process(ctx, snapshot.id.toString(), snapshot.balance, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
}

async function process(
  ctx: EthContext,
  account: string,
  newBalance: bigint,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = await calcPoints(ctx, snapshotTimestampMilli, snapshotBalance);

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
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
