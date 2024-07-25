import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthContext } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import { Pool, Position, Token } from "@cryptoalgebra/integral-sdk";
import { getPoolArgs, updatePoolArgs } from "./pool_args.js";
import { configs, getPoolInfo, isInETH, NETWORK, PoolInfo } from "./config.js";
import {
  AlgebraPoolContext,
  AlgebraPoolProcessor,
  getAlgebraPoolContractOnContext,
} from "./types/eth/algebrapool.js";
import { PositionSnapshot } from "./schema/store.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

configs.forEach((config) =>
  AlgebraPoolProcessor.bind({
    network: NETWORK,
    address: config.address,
  })
    .onEventMint(async (event, ctx) => {
      const { owner, bottomTick, topTick } = event.args;
      const key = getPositionKey(owner, bottomTick, topTick);

      const positionSnapshot = await ctx.store.get(PositionSnapshot, key);
      const poolInfo = getPoolInfo(ctx.address);
      if (!poolInfo) {
        return;
      }
      const newSnapshot = await processPosition(
        ctx,
        key,
        bottomTick,
        topTick,
        poolInfo,
        positionSnapshot,
        event.name
      );
      if (newSnapshot) {
        await ctx.store.upsert(newSnapshot);
      }

      const poolArgs = await getPoolArgsFromChain(ctx, poolInfo.address);
      await updatePoolArgs(ctx, poolInfo.address, poolArgs);
    })
    .onEventBurn(async (event, ctx) => {
      const { owner, bottomTick, topTick } = event.args;
      const key = getPositionKey(owner, bottomTick, topTick);

      const positionSnapshot = await ctx.store.get(PositionSnapshot, key);
      const poolInfo = getPoolInfo(ctx.address);
      if (!poolInfo) {
        return;
      }
      const newSnapshot = await processPosition(
        ctx,
        key,
        bottomTick,
        topTick,
        poolInfo,
        positionSnapshot,
        event.name
      );
      if (newSnapshot) {
        await ctx.store.upsert(newSnapshot);
      }

      const poolArgs = await getPoolArgsFromChain(ctx, poolInfo.address);
      await updatePoolArgs(ctx, poolInfo.address, poolArgs);
    })
    .onEventSwap(async (event, ctx) => {
      const { liquidity, price: sqrtPriceX96, tick } = event.args;
      const poolInfo = getPoolInfo(ctx.address);
      if (!poolInfo) {
        throw new Error(`pool info not found: ${ctx.address}`);
      }
      await updatePoolArgs(ctx, poolInfo.address, {
        liquidity,
        sqrtPriceX96,
        tick,
      });

      const positionSnapshots = await ctx.store.list(PositionSnapshot, [
        {
          field: "poolAddress",
          op: "=",
          value: poolInfo.address,
        },
        {
          field: "tickLower",
          op: "<=",
          value: tick,
        },
        {
          field: "tickUpper",
          op: ">=",
          value: tick,
        },
      ]);
      const newSnapshots = await Promise.all(
        positionSnapshots.map((snapshot) =>
          processPosition(
            ctx,
            snapshot.id.toString(),
            snapshot.tickLower,
            snapshot.tickUpper,
            poolInfo,
            snapshot,
            event.name
          )
        )
      );
      await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
    })
    .onTimeInterval(
      async (_, ctx) => {
        const poolInfo = getPoolInfo(ctx.address);
        if (!poolInfo) {
          throw new Error(`pool info not found: ${ctx.address}`);
        }
        const positionSnapshots = await ctx.store.list(PositionSnapshot, [
          {
            field: "poolAddress",
            op: "=",
            value: poolInfo.address,
          },
        ]);
        const newSnapshots = await Promise.all(
          positionSnapshots.map((snapshot) =>
            processPosition(
              ctx,
              snapshot.id.toString(),
              snapshot.tickLower,
              snapshot.tickUpper,
              poolInfo,
              snapshot,
              "TimeInterval"
            )
          )
        );
        await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
      },
      4 * 60,
      24 * 60
    )
);

// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: AlgebraPoolContext,
  positionKey: string,
  tickLower: bigint,
  tickUpper: bigint,
  poolInfo: PoolInfo,
  positionSnapshot: PositionSnapshot | undefined,
  triggerEvent: string
) {
  const points = positionSnapshot
    ? await calcPoints(ctx, positionSnapshot)
    : new BigDecimal(0);

  // the position is not burned
  const latestPositionSnapshot = await getLatestPositionSnapshot(
    ctx,
    poolInfo,
    positionKey,
    Number(tickLower),
    Number(tickUpper)
  );

  const snapshotOwner = positionSnapshot?.owner ?? "noone";
  const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0;
  const snapshotBalance = positionSnapshot?.balance ?? "0";
  const {
    owner: newOwner,
    timestampMilli: newTimestampMilli,
    balance: newBalance,
  } = latestPositionSnapshot;

  ctx.eventLogger.emit("point_update", {
    account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
    poolAddress: poolInfo.address,
    positionKey,
    tickLower,
    tickUpper,
    points,
    triggerEvent,
    snapshotOwner,
    snapshotTimestampMilli,
    snapshotBalance: snapshotBalance.toString(),
    newOwner,
    newTimestampMilli,
    newBalance: newBalance.toString(),
  });
  return latestPositionSnapshot;
}

async function calcPoints(
  ctx: EthContext,
  snapshot: PositionSnapshot
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

  const points = snapshot.balance.multipliedBy(deltaHour);

  return points;
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: AlgebraPoolContext,
  poolInfo: PoolInfo,
  positionKey: string,
  tickLower: number,
  tickUpper: number
): Promise<PositionSnapshot> {
  const pool = await getPool(ctx, poolInfo);

  const positionResp = await ctx.contract.positions(positionKey);
  const liquidity = positionResp.liquidity.toString();

  const position = new Position({ pool, tickLower, tickUpper, liquidity });
  const balance = isInETH(poolInfo.token0)
    ? position.amount0
    : position.amount1;
  const owner = await getPositionOwner(positionKey);
  return new PositionSnapshot({
    id: positionKey,
    poolAddress: poolInfo.address,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    owner,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    balance: new BigDecimal(balance.toFixed()),
  });
}

async function getPool(ctx: EthContext, poolInfo: PoolInfo): Promise<Pool> {
  const poolArgs =
    (await getPoolArgs(ctx, poolInfo.address)) ??
    (await getPoolArgsFromChain(ctx, poolInfo.address));
  const token0 = new Token(
    Number(NETWORK),
    poolInfo.token0,
    poolInfo.token0Decimals,
    "token0",
    "token0"
  );
  const token1 = new Token(
    Number(NETWORK),
    poolInfo.token1,
    poolInfo.token1Decimals,
    "token1",
    "token1"
  );
  const { sqrtPriceX96, liquidity, tick } = poolArgs;
  return new Pool(
    token0,
    token1,
    100,
    sqrtPriceX96.toString(),
    liquidity.toString(),
    Number(tick),
    poolInfo.tickSpacing
  );
}

async function getPoolArgsFromChain(ctx: EthContext, poolAddress: string) {
  const poolContract = getAlgebraPoolContractOnContext(ctx, poolAddress);
  const liquidity = await poolContract.liquidity();
  const { price: sqrtPriceX96, tick } = await poolContract.globalState();
  return { sqrtPriceX96, liquidity, tick };
}

function getPositionKey(owner: string, tickLower: bigint, tickUpper: bigint) {
  const mask = 0xffffffn;
  const bytes =
    (tickUpper & mask) | ((tickLower & mask) << 24n) | (BigInt(owner) << 48n);
  const key = bytes.toString(16);
  return "0x" + "0".repeat(64 - key.length) + key;
}

function getPositionOwner(positionKey: string) {
  return "0x" + positionKey.slice(14, 54);
}
