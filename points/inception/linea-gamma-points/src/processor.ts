import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import {
  HypervisorContext,
  HypervisorProcessor,
} from "./types/eth/hypervisor.js";
import { AccountSnapshot } from "./schema/store.js";
import {
  GAUGE_ADDRESS,
  GAUGE_START_BLOCK,
  HYPERVISOR_ADDRESS,
  NETWORK,
} from "./config.js";
import { getGaugeV2CLContractOnContext } from "./types/eth/gaugev2cl.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

HypervisorProcessor.bind({
  address: HYPERVISOR_ADDRESS,
  network: NETWORK,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter(
      (account) =>
        !isNullAddress(account) &&
        account.toLowerCase() != GAUGE_ADDRESS.toLowerCase()
    );
    const newSnapshots = (
      await Promise.all(
        accounts.map((account) =>
          process(ctx, ctx.address, account, undefined, event.name)
        )
      )
    ).filter((ret) => ret != undefined);
    await ctx.store.upsert(newSnapshots);
  })
  .onEventRebalance(async (event, ctx) => {
    const snapshots = await ctx.store.list(AccountSnapshot);
    const newSnapshots = (
      await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.vault, snapshot.account, snapshot, event.name)
        )
      )
    ).filter((ret) => ret != undefined);
    await ctx.store.upsert(newSnapshots);
  })
  .onEventZeroBurn(async (event, ctx) => {
    const snapshots = await ctx.store.list(AccountSnapshot);
    const newSnapshots = (
      await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.vault, snapshot.account, snapshot, event.name)
        )
      )
    ).filter((ret) => ret != undefined);
    await ctx.store.upsert(newSnapshots);
  })
  .onTimeInterval(
    async (_, ctx) => {
      const snapshots = await ctx.store.list(AccountSnapshot, []);
      const newSnapshots = (
        await Promise.all(
          snapshots.map((snapshot) =>
            process(
              ctx,
              snapshot.vault,
              snapshot.account,
              snapshot,
              "TimeInterval"
            )
          )
        )
      ).filter((ret) => ret != undefined);
      await ctx.store.upsert(newSnapshots);
    },
    4 * 60,
    24 * 60
  );

async function getAccountSnapshot(
  ctx: HypervisorContext,
  account: string,
  vault: string,
  timestampMilli: number
) {
  const [totalShares, { total0 }, share, gaugeShare] = await Promise.all([
    ctx.contract.totalSupply(),
    ctx.contract.getTotalAmounts(),
    ctx.contract.balanceOf(account),
    ctx.blockNumber >= GAUGE_START_BLOCK
      ? getGaugeV2CLContractOnContext(ctx, GAUGE_ADDRESS).balanceOf(account)
      : Promise.resolve(0n),
  ]);
  const balance = (total0 * (share + gaugeShare)) / totalShares;
  return new AccountSnapshot({
    id: vault + "." + account,
    vault,
    account,
    timestampMilli: BigInt(timestampMilli),
    balance,
  });
}

async function process(
  ctx: HypervisorContext,
  vault: string,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (vault !== ctx.address) {
    return;
  }
  const id = vault + "." + account;
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, id);
  }
  const points = snapshot
    ? await calculatePoints(ctx, snapshot.timestampMilli, snapshot.balance)
    : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(
    ctx,
    account,
    vault,
    ctx.timestamp.getTime()
  );
  ctx.eventLogger.emit("point_update", {
    account,
    vault,
    points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotBalance: snapshot?.balance ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calculatePoints(
  ctx: HypervisorContext,
  snapshotTimestampMilli: bigint,
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
    .multipliedBy(deltaHour);

  return points;
}
