import { PairContext, PairProcessor } from "./types/eth/pair.js";

import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  configs,
  gaugeMap,
  getPoolInfo,
  isStone,
  NETWORK,
  PoolInfo,
} from "./config.js";
import { AccountSnapshot } from "./schema/store.js";
import { getGaugeV2ContractOnContext } from "./types/eth/gaugev2.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((config) =>
  PairProcessor.bind({
    network: NETWORK,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const poolInfo = getPoolInfo(ctx.address);
      if (!poolInfo) {
        throw new Error(`pool info not found: ${ctx.address}`);
      }
      const { from, to } = event.args;
      if (from == to) {
        return;
      }
      const accounts = [from, to].filter((account) => !isNullAddress(account));
      const newSnapshots = await Promise.all(
        accounts.map((account) =>
          process(ctx, account, poolInfo, undefined, event.name)
        )
      );
      await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
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

async function updateAllForPool(ctx: PairContext, triggerEvent: string) {
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
  ctx: PairContext,
  account: string,
  poolInfo: PoolInfo,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (isProtocolAddress(account)) {
    return;
  }
  const id = poolInfo.address + "." + account;
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, id);
  }
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  let [{ _reserve0: amount0, _reserve1: amount1 }, lpBalance, totalSupply] =
    await Promise.all([
      ctx.contract.getReserves(),
      ctx.contract.balanceOf(account),
      ctx.contract.totalSupply(),
    ]);
  const gauge = gaugeMap[poolInfo.address.toLowerCase()];
  if (gauge && ctx.blockNumber >= gauge.startBlock) {
    const c = getGaugeV2ContractOnContext(ctx, gauge.address);
    lpBalance += await c.balanceOf(account);
  }
  const amountStone = isStone(poolInfo.token0) ? amount0 : amount1;
  const newStoneBalance = amountStone
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(lpBalance.asBigDecimal())
    .div(totalSupply.asBigDecimal());

  const newSnapshot = new AccountSnapshot({
    id,
    account,
    poolAddress: poolInfo.address,
    stoneBalance: newStoneBalance,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
  });
  ctx.eventLogger.emit("point_update", {
    account,
    poolAddress: poolInfo.address,
    points,
    triggerEvent,
    snapshotStoneBalance: snapshot?.stoneBalance ?? 0n,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    newStoneBalance: newStoneBalance.toString(),
    newTimestampMilli: newSnapshot.timestampMilli,
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

function isProtocolAddress(address: string) {
  return (
    isNullAddress(address) ||
    Object.values(gaugeMap)
      .map((s) => s.address.toLowerCase())
      .includes(address.toLowerCase()) ||
    address.toLowerCase() ===
      "0x3D10ae46FD56832A8bDE6172640988F57096D90F".toLowerCase() // StrategyLynexSolidly
  );
}
