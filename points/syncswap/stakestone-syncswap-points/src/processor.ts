// @ts-nocheck
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { aquaPools, classicPools, getStoneIndex } from "./config.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  SyncSwapCryptoPoolContext,
  SyncSwapCryptoPoolProcessor,
} from "./types/eth/syncswapcryptopool.js";
import {
  SyncSwapClassicPoolContext,
  SyncSwapClassicPoolProcessor,
} from "./types/eth/syncswapclassicpool.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

const lastEigenRatioTimestamp: Record<string, number> = {};

GLOBAL_CONFIG.execution = {
  sequential: true,
};

aquaPools.forEach((config) =>
  SyncSwapCryptoPoolProcessor.bind({
    network: config.network,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const accounts = [event.args.from, event.args.to].filter(
        (addr) => !isNullAddress(addr)
      );
      const newSnapshots = await Promise.all(
        accounts.map((account) =>
          processAccount(ctx, account, undefined, event.name)
        )
      );
      await storeUpsert(ctx, newSnapshots);
    })
    .onEventSwap(async (event, ctx) => {
      await updateAllForPool(ctx, event.name);
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

classicPools.forEach((config) =>
  SyncSwapClassicPoolProcessor.bind({
    network: config.network,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const accounts = [event.args.from, event.args.to].filter(
        (addr) => !isNullAddress(addr)
      );
      const newSnapshots = await Promise.all(
        accounts.map((account) =>
          processAccount(ctx, account, undefined, event.name)
        )
      );
      await storeUpsert(ctx, newSnapshots);
    })
    .onEventSwap(async (event, ctx) => {
      const snapshots = await storeListAll(ctx, AccountSnapshot, [
        {
          field: "poolAddress",
          op: "=",
          value: ctx.contract.address,
        },
      ]);
      const newSnapshots = await Promise.all(
        snapshots.map((snapshot) =>
          processAccount(ctx, snapshot.id.toString(), snapshot, event.name)
        )
      );
      await storeUpsert(ctx, newSnapshots);
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

export async function updateAllForPool(
  ctx: SyncSwapCryptoPoolContext | SyncSwapClassicPoolContext,
  triggerEvent: string
) {
  const snapshots = await storeListAll(ctx, AccountSnapshot, [
    {
      field: "poolAddress",
      op: "=",
      value: ctx.address,
    },
  ]);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      processAccount(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await storeUpsert(ctx, newSnapshots);
}

async function processAccount(
  ctx: SyncSwapCryptoPoolContext | SyncSwapClassicPoolContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  const stoneIndex = getStoneIndex(ctx.contract.address);
  if (stoneIndex == undefined) {
    throw new Error(`not stone pool ${ctx.contract.address}`);
  }
  if (!snapshot) {
    snapshot = await storeGet(ctx, AccountSnapshot, account);
  }
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotStoneBalance = snapshot?.stoneBalance ?? 0n;

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());

  const lpBalance = await ctx.contract.balanceOf(account);
  const lpSupply = await ctx.contract.totalSupply();
  const stoneReserve = await (stoneIndex == 0
    ? ctx.contract.reserve0()
    : ctx.contract.reserve1());
  const newStoneBalance = BigInt(
    stoneReserve
      .asBigDecimal()
      .multipliedBy(lpBalance.asBigDecimal())
      .div(lpSupply.asBigDecimal())
      .toFixed(0)
  );

  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
    poolAddress: ctx.contract.address,
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
      snapshot.timestampMilli,
      snapshot.stoneBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const eigenRatio = await getEigenRatio(ctx);
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshot.stoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(eigenRatio.ratio)
    .multipliedBy(deltaHour);

  return points;
}
