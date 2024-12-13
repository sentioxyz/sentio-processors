import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  configs,
  getPoolInfo,
  isStone,
  NETWORK,
  PoolInfo,
  TOKEN_DECIMALS,
} from "./config.js";
import {
  PancakePairContext,
  PancakePairProcessor,
} from "./types/eth/pancakepair.js";
import { AccountSnapshot } from "./schema/store.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((config) =>
  PancakePairProcessor.bind({
    network: NETWORK,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const accounts = [event.args.from, event.args.to].filter(
        (account) => !isNullAddress(account)
      );
      const snapshots = await ctx.store.list(AccountSnapshot, [
        {
          field: "poolAddress",
          op: "=",
          value: ctx.address,
        },
      ]);
      const newSnapshots = await Promise.all([
        ...snapshots
          .filter((snapshot) => !accounts.includes(snapshot.account))
          .map((snapshot) =>
            process(ctx, snapshot.account, config, snapshot, event.name)
          ),
        ...accounts.map((account) =>
          process(ctx, account, config, undefined, event.name)
        ),
      ]);
      await ctx.store.upsert(newSnapshots);
    })
    .onEventSync(async (event, ctx) => {
      const snapshots = await ctx.store.list(AccountSnapshot, [
        {
          field: "poolAddress",
          op: "=",
          value: ctx.address,
        },
      ]);
      const newSnapshots = await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.account, config, snapshot, event.name)
        )
      );
      await ctx.store.upsert(newSnapshots);
    })
    .onEventSwap(async (event, ctx) => {
      const snapshots = await ctx.store.list(AccountSnapshot, [
        {
          field: "poolAddress",
          op: "=",
          value: ctx.address,
        },
      ]);
      const newSnapshots = await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.account, config, snapshot, event.name)
        )
      );
      await ctx.store.upsert(newSnapshots);
    })
    .onTimeInterval(
      async (_, ctx) => {
        await updateAllForPool(ctx, "TimeInterval");
      },
      4 * 60,
      24 * 60
    )
    .onTimeInterval(
      async (_, ctx) => {
        const ratio = await getEigenRatio(ctx);
        const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
        if (ratio.timestampMilli == las) {
          return;
        }
        await updateAllForPool(ctx, "EigenRatioUpdate");
        lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
          ratio.timestampMilli;
      },
      30,
      30
    )
);

async function updateAllForPool(ctx: PancakePairContext, triggerEvent: string) {
  const positionSnapshots = await ctx.store.list(AccountSnapshot, [
    {
      field: "poolAddress",
      op: "=",
      value: ctx.address,
    },
  ]);
  const poolInfo = getPoolInfo(ctx.address);
  if (!poolInfo) {
    throw new Error(`pool info not found: ${ctx.address}`);
  }
  const newSnapshots = await Promise.all(
    positionSnapshots.map((snapshot) =>
      process(ctx, snapshot.account, poolInfo, snapshot, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
}

async function process(
  ctx: PancakePairContext,
  account: string,
  poolInfo: PoolInfo,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  const id = poolInfo.address + "." + account;
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, id);
  }
  const snapshotTimestampMilli = snapshot?.timestampMilli ?? 0n;
  const snapshotBalance = snapshot?.stoneBalance ?? new BigDecimal(0);

  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);
  const [lpBalance, totalSupply, reserves] = await Promise.all([
    ctx.contract.balanceOf(account),
    ctx.contract.totalSupply(),
    ctx.contract.getReserves(),
  ]);
  const reserveStone = isStone(poolInfo.token0)
    ? reserves._reserve0
    : reserves._reserve1;
  const newBalance = (reserveStone * lpBalance)
    .scaleDown(TOKEN_DECIMALS)
    .div(totalSupply.asBigDecimal());

  const newSnapshot = new AccountSnapshot({
    id,
    account,
    poolAddress: poolInfo.address,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    stoneBalance: newBalance,
  });
  ctx.eventLogger.emit("point_update", {
    account,
    poolAddress: poolInfo.address,
    points,
    snapshotTimestampMilli,
    snapshotBalance,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance,
    triggerEvent,
  });
  return newSnapshot;
}

async function calcPoints(
  ctx: EthContext,
  snapshot: AccountSnapshot
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshot.timestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshot.stoneBalance
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
