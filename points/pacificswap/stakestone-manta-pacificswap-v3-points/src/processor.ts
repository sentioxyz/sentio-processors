import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import {
  NonfungiblePositionManagerProcessor,
  getNonfungiblePositionManagerContractOnContext,
} from "./types/eth/nonfungiblepositionmanager.js";
import { Pool, Position } from "@pancakeswap/v3-sdk";
import { Token } from "@pancakeswap/swap-sdk-core";
import { PositionSnapshot } from "./schema/store.js";
import { getPoolArgs, updatePoolArgs } from "./pool_args.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  configs,
  getPoolInfo,
  isStone,
  NETWORK,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT,
  POOL_START_BLOCK,
  PoolInfo,
} from "./config.js";
import {
  getPancakeV3PoolContractOnContext,
  PancakeV3PoolProcessor,
} from "./types/eth/pancakev3pool.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

// represents response of NonfungiblePositionManager.positions(tokenId)
interface PositionInfo {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
}

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

NonfungiblePositionManagerProcessor.bind({
  network: NETWORK,
  address: NONFUNGIBLE_POSITION_MANAGER_CONTRACT,
  startBlock: POOL_START_BLOCK,
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    const poolInfo = positionSnapshot
      ? getPoolInfo(positionSnapshot.poolAddress)
      : await checkNFT(ctx, tokenId);
    if (!poolInfo) {
      return;
    }
    const newSnapshot = await processPosition(
      ctx,
      tokenId,
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
  .onEventDecreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    // specific NFT can be burned in the txn
    // then positions(tokenId) reverts and we will skip the event
    if (!positionSnapshot) return;
    const poolInfo = getPoolInfo(positionSnapshot.poolAddress)!;

    const newSnapshot = await processPosition(
      ctx,
      tokenId,
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
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to];
    if (accounts.some(isNullAddress)) return;

    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    if (!positionSnapshot) return;
    const poolInfo = await checkNFT(ctx, tokenId);
    if (!poolInfo) {
      return;
    }

    const newSnapshot = await processPosition(
      ctx,
      tokenId,
      poolInfo,
      positionSnapshot,
      event.name
    );
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot);
    }
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

configs.forEach((config) =>
  PancakeV3PoolProcessor.bind({
    network: NETWORK,
    address: config.address,
  }).onEventSwap(async (event, ctx) => {
    const { liquidity, sqrtPriceX96, tick } = event.args;
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
          poolInfo,
          snapshot,
          event.name
        )
      )
    );
    await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
  })
);

async function updateAll(ctx: EthContext, triggerEvent: string) {
  const positionSnapshots = await ctx.store.list(PositionSnapshot, []);
  const newSnapshots = await Promise.all(
    positionSnapshots.map((snapshot) =>
      processPosition(
        ctx,
        snapshot.id.toString(),
        getPoolInfo(snapshot.poolAddress)!,
        snapshot,
        triggerEvent
      )
    )
  );
  await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
}

// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: EthContext,
  tokenId: string,
  poolInfo: PoolInfo,
  positionSnapshot: PositionSnapshot | undefined,
  triggerEvent: string
) {
  const points = positionSnapshot
    ? await calcPoints(ctx, positionSnapshot)
    : new BigDecimal(0);

  try {
    // the position is not burned
    const latestPositionSnapshot = await getLatestPositionSnapshot(
      ctx,
      poolInfo,
      tokenId
    );

    const snapshotOwner = positionSnapshot?.owner ?? "noone";
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0;
    const snapshotStoneBalance = positionSnapshot?.stoneBalance ?? "0";
    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      stoneBalance: newStoneBalance,
    } = latestPositionSnapshot;

    ctx.eventLogger.emit("point_update", {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      poolAddress: poolInfo.address,
      points,
      triggerEvent,
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotStoneBalance: snapshotStoneBalance.toString(),
      newOwner,
      newTimestampMilli,
      newStoneBalance: newStoneBalance.toString(),
    });
    return latestPositionSnapshot;
  } catch (e) {
    if (e.message.includes("Invalid token ID")) {
      // the position is burned
      await ctx.store.delete(PositionSnapshot, tokenId);
      ctx.timestamp;

      // since the txn burns the position, it is safe to assume positionSnapshot is not null
      const {
        owner: snapshotOwner,
        timestampMilli: snapshotTimestampMilli,
        stoneBalance: snapshotStoneBalance,
      } = positionSnapshot!;

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        poolAddress: poolInfo.address,
        points,
        triggerEvent,
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotStoneBalance: snapshotStoneBalance.toString(),
        newOwner: "noone",
        newTimestampMilli: ctx.timestamp.getTime(),
        newStoneBalance: "0",
      });
    }
  }
  return;
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

  const points = snapshot.stoneBalance
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  poolInfo: PoolInfo,
  tokenId: string
): Promise<PositionSnapshot> {
  const pool = await getPool(ctx, poolInfo);
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  );
  const position = new Position({ pool, tickLower, tickUpper, liquidity });
  const stoneBalance = isStone(poolInfo.token0)
    ? position.amount0
    : position.amount1;
  const owner = await getPositionOwner(ctx, tokenId);
  return new PositionSnapshot({
    id: tokenId,
    poolAddress: poolInfo.address,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    owner,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    stoneBalance: new BigDecimal(stoneBalance.toFixed()),
  });
}

async function getPool(ctx: EthContext, poolInfo: PoolInfo): Promise<Pool> {
  const poolArgs =
    (await getPoolArgs(ctx, poolInfo.address)) ??
    (await getPoolArgsFromChain(ctx, poolInfo.address));
  const token0 = new Token(
    Number(NETWORK),
    poolInfo.token0 as any,
    poolInfo.token0Decimals,
    "token0",
    "token0"
  );
  const token1 = new Token(
    Number(NETWORK),
    poolInfo.token1 as any,
    poolInfo.token1Decimals,
    "token1",
    "token1"
  );
  const { sqrtPriceX96, liquidity, tick } = poolArgs;
  return new Pool(
    token0,
    token1,
    poolInfo.fee,
    sqrtPriceX96.toString(),
    liquidity.toString(),
    Number(tick)
  );
}

async function getPoolArgsFromChain(ctx: EthContext, poolAddress: string) {
  const poolContract = getPancakeV3PoolContractOnContext(ctx, poolAddress);
  const liquidity = await poolContract.liquidity();
  const { sqrtPriceX96, tick } = await poolContract.slot0();
  return { sqrtPriceX96, liquidity, tick };
}

async function getPositionInfo(
  ctx: EthContext,
  tokenId: string
): Promise<PositionInfo> {
  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT
  );
  const positionResponse = await nfpmContract.positions(tokenId);
  return {
    token0: positionResponse.token0,
    token1: positionResponse.token1,
    fee: Number(positionResponse.fee),
    tickLower: Number(positionResponse.tickLower),
    tickUpper: Number(positionResponse.tickUpper),
    liquidity: positionResponse.liquidity.toString(),
  };
}

async function getPositionOwner(
  ctx: EthContext,
  tokenId: string
): Promise<string> {
  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT
  );
  return await nfpmContract.ownerOf(tokenId);
}

async function checkNFT(
  ctx: EthContext,
  tokenId: string
): Promise<PoolInfo | undefined> {
  try {
    // positions(tokenId) call may fail
    const positionResponse = await getPositionInfo(ctx, tokenId);
    const pool = configs.find(
      (config) =>
        positionResponse.token0.toLowerCase() === config.token0.toLowerCase() &&
        positionResponse.token1.toLowerCase() === config.token1.toLowerCase() &&
        positionResponse.fee === config.fee
    );
    return pool;
  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    );
    return undefined;
  }
}
