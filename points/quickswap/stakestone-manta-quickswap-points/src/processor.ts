import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import {
  NonfungiblePositionManagerContext,
  NonfungiblePositionManagerProcessor,
  getNonfungiblePositionManagerContractOnContext,
} from "./types/eth/nonfungiblepositionmanager.js";
import { Pool, Position } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { PositionSnapshot } from "./schema/store.js";
import { getPoolArgs, updatePoolArgs } from "./pool_args.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  UniswapV3PoolProcessor,
  getUniswapV3PoolContractOnContext,
} from "./types/eth/uniswapv3pool.js";
import {
  NETWORK,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  POOLS,
  POOLS_START_BLOCK,
  POOL_ADDRESSES,
  PoolBaseInfo,
  STONE_ADDRESS,
} from "./configs.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

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

async function getPositionAndPool(
  ctx: NonfungiblePositionManagerContext,
  tokenId: string
) {
  const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
  if (positionSnapshot) {
    return { positionSnapshot, poolAddress: positionSnapshot.poolAddress };
  }
  const pool = await getPoolBaseInfoByNFT(ctx, tokenId);
  if (!pool) {
    return { positionSnapshot: undefined, poolAddress: undefined };
  }
  return { positionSnapshot: undefined, poolAddress: pool.address };
}

NonfungiblePositionManagerProcessor.bind({
  network: NETWORK,
  address: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  startBlock: POOLS_START_BLOCK,
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const { positionSnapshot, poolAddress } = await getPositionAndPool(
      ctx,
      tokenId
    );
    if (!poolAddress) {
      return;
    }

    const newSnapshot = await processPosition(
      ctx,
      poolAddress,
      tokenId,
      positionSnapshot,
      event.name
    );
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot);
    }

    const poolArgs = await getPoolArgsFromChain(ctx, poolAddress);
    await updatePoolArgs(ctx, poolAddress, poolArgs);
  })
  .onEventDecreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const { positionSnapshot, poolAddress } = await getPositionAndPool(
      ctx,
      tokenId
    );
    if (!positionSnapshot || !poolAddress) {
      return;
    }

    const newSnapshot = await processPosition(
      ctx,
      poolAddress,
      tokenId,
      positionSnapshot,
      event.name
    );
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot);
    }

    const poolArgs = await getPoolArgsFromChain(ctx, poolAddress);
    await updatePoolArgs(ctx, poolAddress, poolArgs);
  })
  .onEventTransfer(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const accounts = [event.args.from, event.args.to];
    if (accounts.some(isNullAddress)) return;

    const { positionSnapshot, poolAddress } = await getPositionAndPool(
      ctx,
      tokenId
    );
    if (!positionSnapshot || !poolAddress) {
      return;
    }

    const newSnapshot = await processPosition(
      ctx,
      poolAddress,
      tokenId,
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

POOL_ADDRESSES.forEach((address) =>
  UniswapV3PoolProcessor.bind({
    network: NETWORK,
    address: address,
  }).onEventSwap(async (event, ctx) => {
    const { liquidity, sqrtPriceX96, tick } = event.args;
    await updatePoolArgs(ctx, ctx.address, { liquidity, sqrtPriceX96, tick });

    const positionSnapshots = await ctx.store.list(PositionSnapshot, [
      {
        field: "poolAddress",
        op: "=",
        value: ctx.address,
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
          snapshot.poolAddress,
          snapshot.id.toString(),
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
        snapshot.poolAddress,
        snapshot.id.toString(),
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
  poolAddress: string,
  tokenId: string,
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
      poolAddress,
      tokenId
    );

    const snapshotOwner = positionSnapshot?.owner ?? "noone";
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0n;
    const snapshotStoneBalance = positionSnapshot?.amountStone ?? 0n;
    const snapshotBaseBalance = positionSnapshot?.amountBase ?? 0n;
    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      amountStone: newStoneBalance,
      amountBase: newBaseBalance,
    } = latestPositionSnapshot;

    ctx.eventLogger.emit("point_update", {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      poolAddress,
      points,
      triggerEvent,
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotBaseBalance,
      snapshotStoneBalance,
      newOwner,
      newTimestampMilli,
      newBaseBalance,
      newStoneBalance,
    });
    return latestPositionSnapshot;
  } catch (e) {
    if (e.message.includes("Invalid token ID")) {
      // the position is burned
      await ctx.store.delete(PositionSnapshot, tokenId);

      // since the txn burns the position, it is safe to assume positionSnapshot is not null
      const {
        owner: snapshotOwner,
        timestampMilli: snapshotTimestampMilli,
        amountBase: snapshotBaseBalance,
        amountStone: snapshotStoneBalance,
      } = positionSnapshot!;

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        poolAddress,
        points,
        triggerEvent,
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotBaseBalance,
        snapshotStoneBalance,
        newOwner: "noone",
        newTimestampMilli: ctx.timestamp.getTime(),
        newETHBalance: 0,
        newStoneBalance: 0,
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
  const stoneBalance = snapshot.amountStone;

  const points = stoneBalance
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  poolAddress: string,
  tokenId: string
): Promise<PositionSnapshot> {
  const pool = await getPool(ctx, poolAddress);
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  );
  const position = new Position({ pool, tickLower, tickUpper, liquidity });

  const token0IsStone =
    pool.token0.address.toLowerCase() === STONE_ADDRESS.toLowerCase();

  const amount0 = BigDecimal(position.amount0.toFixed());
  const amount1 = BigDecimal(position.amount1.toFixed());
  const owner = await getPositionOwner(ctx, tokenId);
  return new PositionSnapshot({
    id: tokenId,
    poolAddress,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    owner,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    amountStone: token0IsStone ? amount0 : amount1,
    amountBase: token0IsStone ? amount1 : amount0,
  });
}

async function getPool(ctx: EthContext, address: string): Promise<Pool> {
  const poolArgs =
    (await getPoolArgs(ctx, address)) ??
    (await getPoolArgsFromChain(ctx, address));
  const { token0: token0Address, token1: token1Address, fee } = POOLS[address];
  const token0 = new Token(
    Number(NETWORK),
    token0Address,
    TOKEN_DECIMALS,
    "token0",
    "token0"
  );
  const token1 = new Token(
    Number(NETWORK),
    token1Address,
    TOKEN_DECIMALS,
    "token1",
    "token1"
  );
  const { sqrtPriceX96, liquidity, tick } = poolArgs;
  return new Pool(
    token0,
    token1,
    fee,
    sqrtPriceX96.toString(),
    liquidity.toString(),
    Number(tick)
  );
}

async function getPoolArgsFromChain(ctx: EthContext, address: string) {
  const poolContract = getUniswapV3PoolContractOnContext(ctx, address);
  const liquidity = await poolContract.liquidity();
  const { sqrtPriceX96, tick } = await poolContract.slot0();
  return { sqrtPriceX96, liquidity, tick };
}

async function getPositionInfo(
  ctx: EthContext,
  tokenId: string
): Promise<PositionInfo> {
  const nfpm = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS
  );
  const positionResponse = await nfpm.positions(tokenId);
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
  const nfpm = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS
  );
  return await nfpm.ownerOf(tokenId);
}

async function getPoolBaseInfoByNFT(
  ctx: EthContext,
  tokenId: string
): Promise<PoolBaseInfo | undefined> {
  try {
    // positions(tokenId) call may fail
    const position = await getPositionInfo(ctx, tokenId);
    return Object.values(POOLS).find(
      (pool) =>
        position.token0.toLowerCase() === pool.token0.toLowerCase() &&
        position.token1.toLowerCase() === pool.token1.toLowerCase() &&
        position.fee === pool.fee
    );
  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    );
    return undefined;
  }
}
