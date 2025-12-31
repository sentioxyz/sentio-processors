import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import {
  NonfungiblePositionManagerContext,
  NonfungiblePositionManagerProcessor,
  getNonfungiblePositionManagerContractOnContext,
} from "./types/eth/nonfungiblepositionmanager.js";
import { Pool, Position } from "@pancakeswap/v3-sdk";
import { Token } from "@pancakeswap/swap-sdk-core";
import {
  PancakeV3PoolProcessor,
  getPancakeV3PoolContractOnContext,
} from "./types/eth/pancakev3pool.js";
import { PositionSnapshot } from "./schema/store.js";
import { getPoolArgs, updatePoolArgs } from "./pool_args.js";
import { getEigenRatio } from "./eigen_ratio.js";

const NETWORK = EthChainId.BSC;
const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
  "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364";
const POOL_ADDRESS = "0xb66cb4092277ee946d4fba1d34f425329fedd37e";
const TOKEN0_ADDRESS = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"; // ETH
const TOKEN1_ADDRESS = "0x80137510979822322193fc997d400d5a6c747bf7"; // STONE
const POOL_START_BLOCK = 38624246;
const POOL_FEE = 500;

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

NonfungiblePositionManagerProcessor.bind({
  network: NETWORK,
  address: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  startBlock: POOL_START_BLOCK,
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    if (!positionSnapshot && !(await checkNFT(ctx, tokenId))) return;

    const newSnapshot = await processPosition(
      ctx,
      tokenId,
      positionSnapshot,
      event.name
    );
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot);
    }

    const poolArgs = await getPoolArgsFromChain(ctx);
    await updatePoolArgs(ctx, poolArgs);
  })
  .onEventDecreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    // specific NFT can be burned in the txn
    // then positions(tokenId) reverts and we will skip the event
    if (!positionSnapshot) return;

    const newSnapshot = await processPosition(
      ctx,
      tokenId,
      positionSnapshot,
      event.name
    );
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot);
    }

    const poolArgs = await getPoolArgsFromChain(ctx);
    await updatePoolArgs(ctx, poolArgs);
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to];
    if (accounts.some(isNullAddress)) return;

    const tokenId = event.args.tokenId.toString();
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId);
    if (!positionSnapshot) return;

    const newSnapshot = await processPosition(
      ctx,
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

async function updateAll(ctx: EthContext, triggerEvent: string) {
  const positionSnapshots = await ctx.store.list(PositionSnapshot, []);
  const newSnapshots = await Promise.all(
    positionSnapshots.map((snapshot) =>
      processPosition(ctx, snapshot.id.toString(), snapshot, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
}

PancakeV3PoolProcessor.bind({
  network: NETWORK,
  address: POOL_ADDRESS,
}).onEventSwap(async (event, ctx) => {
  const { liquidity, sqrtPriceX96, tick } = event.args;
  await updatePoolArgs(ctx, { liquidity, sqrtPriceX96, tick });

  const positionSnapshots = await ctx.store.list(PositionSnapshot, [
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
      processPosition(ctx, snapshot.id.toString(), snapshot, event.name)
    )
  );
  await ctx.store.upsert(newSnapshots.filter((s) => s != undefined));
});

// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: EthContext,
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
      tokenId
    );

    const snapshotOwner = positionSnapshot?.owner ?? "noone";
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0;
    const snapshotETHBalance = positionSnapshot?.amount0 ?? "0";
    const snapshotStoneBalance = positionSnapshot?.amount1 ?? "0";
    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      amount0: newETHBalance,
      amount1: newStoneBalance,
    } = latestPositionSnapshot;

    ctx.eventLogger.emit("point_update", {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      points,
      triggerEvent,
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotETHBalance: snapshotETHBalance.toString(),
      snapshotStoneBalance: snapshotStoneBalance.toString(),
      newOwner,
      newTimestampMilli,
      newETHBalance: newETHBalance.toString(),
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
        amount0: snapshotETHBalance,
        amount1: snapshotStoneBalance,
      } = positionSnapshot!;

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        points,
        triggerEvent,
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotETHBalance: snapshotETHBalance.toString(),
        snapshotStoneBalance: snapshotStoneBalance.toString(),
        newOwner: "noone",
        newTimestampMilli: ctx.timestamp.getTime(),
        newETHBalance: "0",
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
  const stoneBalance = snapshot.amount1;

  const points = stoneBalance
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  tokenId: string
): Promise<PositionSnapshot> {
  const pool = await getPool(ctx);
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  );
  const position = new Position({ pool, tickLower, tickUpper, liquidity });
  const amount0 = BigDecimal(position.amount0.toFixed());
  const amount1 = BigDecimal(position.amount1.toFixed());
  const owner = await getPositionOwner(ctx, tokenId);
  return new PositionSnapshot({
    id: tokenId,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    owner,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    amount0,
    amount1,
  });
}

async function getPool(ctx: EthContext): Promise<Pool> {
  const poolArgs =
    (await getPoolArgs(ctx)) ?? (await getPoolArgsFromChain(ctx));
  const token0 = new Token(
    Number(NETWORK),
    TOKEN0_ADDRESS,
    TOKEN_DECIMALS,
    "token0",
    "token0"
  );
  const token1 = new Token(
    Number(NETWORK),
    TOKEN1_ADDRESS,
    TOKEN_DECIMALS,
    "token1",
    "token1"
  );
  const { sqrtPriceX96, liquidity, tick } = poolArgs;
  return new Pool(
    token0,
    token1,
    Number(POOL_FEE),
    sqrtPriceX96.toString(),
    liquidity.toString(),
    Number(tick)
  );
}

async function getPoolArgsFromChain(ctx: EthContext) {
  const poolContract = getPancakeV3PoolContractOnContext(ctx, POOL_ADDRESS);
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
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
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
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
  );
  return await nfpmContract.ownerOf(tokenId);
}

// check if the PancakeV3 NFT is for the pool
async function checkNFT(ctx: EthContext, tokenId: string): Promise<boolean> {
  try {
    // positions(tokenId) call may fail
    const positionResponse = await getPositionInfo(ctx, tokenId);
    return (
      positionResponse.token0.toLowerCase() === TOKEN0_ADDRESS.toLowerCase() &&
      positionResponse.token1.toLowerCase() === TOKEN1_ADDRESS.toLowerCase() &&
      positionResponse.fee === 500
    );
  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    );
    return false;
  }
}
