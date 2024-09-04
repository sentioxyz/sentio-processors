// @ts-nocheck
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, EthContext } from "@sentio/sdk/eth";
import { getLiquidityValue } from "iziswap-sdk/lib/liquidityManager";

import {
  TOKEN_DECIMALS,
  getPoolInfo,
  isRelatedPool,
  liquidityManagerAddresses,
  poolConfigs,
} from "./config.js";
import {
  storeDelete,
  storeGet,
  storeListAll,
  storeUpsert,
} from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  getIZiSwapPoolContractOnContext,
  IZiSwapPoolProcessor,
} from "./types/eth/iziswappool.js";
import {
  getLiquidityManagerContractOnContext,
  LiquidityManagerProcessor,
} from "./types/eth/liquiditymanager.js";
import { PositionSnapshot } from "./schema/store.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

const lastEigenRatioTimestamp: Record<string, number> = {};

poolConfigs.forEach((config) =>
  IZiSwapPoolProcessor.bind(config).onEventSwap(async (event, ctx) => {
    const poolAddress = ctx.address.toLowerCase();
    const snapshots = await storeListAll(ctx, PositionSnapshot, [
      {
        field: "poolAddress",
        op: "=",
        value: poolAddress,
      },
    ]);
    const newSnapshots = await Promise.all(
      snapshots.map((snapshot) =>
        processPosition(
          ctx,
          poolAddress,
          snapshot.id.toString(),
          snapshot,
          event.name
        )
      )
    );
    await storeUpsert(
      ctx,
      newSnapshots.filter((s) => s !== undefined)
    );
  })
);

Object.entries(liquidityManagerAddresses).forEach(([network, address]) =>
  LiquidityManagerProcessor.bind({
    network: network as EthChainId,
    address,
    startBlock: Math.min(
      ...poolConfigs
        .filter((conf) => conf.network == network)
        .map((pool) => pool.startBlock)
    ),
  })
    .onEventAddLiquidity(async (event, ctx) => {
      if (!isRelatedPool(ctx.chainId, event.args.pool)) {
        return;
      }
      const tokenId = event.args.nftId.toString();
      const snapshot = await storeGet(ctx, PositionSnapshot, tokenId);
      const newSnapshot = await processPosition(
        ctx,
        event.args.pool,
        tokenId,
        snapshot,
        event.name
      );
      if (newSnapshot) {
        await storeUpsert(ctx, newSnapshot);
      }
    })
    .onEventDecLiquidity(async (event, ctx) => {
      if (!isRelatedPool(ctx.chainId, event.args.pool)) {
        return;
      }
      const tokenId = event.args.nftId.toString();
      const snapshot = await storeGet(ctx, PositionSnapshot, tokenId);
      const newSnapshot = await processPosition(
        ctx,
        event.args.pool,
        tokenId,
        snapshot,
        event.name
      );
      if (newSnapshot) {
        await storeUpsert(ctx, newSnapshot);
      }
    })
    .onEventTransfer(async (event, ctx) => {
      const tokenId = event.args.tokenId.toString();
      const snapshot = await storeGet(ctx, PositionSnapshot, tokenId);
      if (!snapshot) {
        // not related
        return;
      }
      const newSnapshot = await processPosition(
        ctx,
        snapshot.poolAddress,
        tokenId,
        snapshot,
        event.name
      );
      if (newSnapshot) {
        await storeUpsert(ctx, newSnapshot);
      } else if (snapshot) {
        await storeDelete(ctx, PositionSnapshot, tokenId);
      }
    })
    .onTimeInterval(
      async (_, ctx) => {
        await updateAll(ctx, "TimeInterval");
      },
      4 * 60,
      10 * 24 * 60
    )
    .onTimeInterval(
      async (_, ctx) => {
        const ratio = await getEigenRatio(ctx);
        const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
        if (ratio.timestampMilli == las) {
          return;
        }
        await updateAll(ctx, "EigenRatioUpdate");
        lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
          ratio.timestampMilli;
      },
      30,
      30
    )
);

async function updateAll(ctx: EthContext, triggerEvent: string) {
  const snapshots = await storeListAll(ctx, PositionSnapshot);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      processPosition(
        ctx,
        snapshot.poolAddress,
        snapshot.id.toString(),
        snapshot,
        triggerEvent
      )
    )
  );
  await storeUpsert(
    ctx,
    newSnapshots.filter((s) => s !== undefined)
  );
}

async function processPosition(
  ctx: EthContext,
  poolAddress: string,
  tokenId: string,
  snapshot: PositionSnapshot | undefined,
  triggerEvent: string
): Promise<PositionSnapshot | undefined> {
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  poolAddress = poolAddress.toLowerCase();
  const poolInfo = getPoolInfo(ctx.chainId, poolAddress);
  if (!poolInfo) {
    console.warn("not related pool", ctx.chainId, poolAddress);
    return undefined;
  }
  const liqMgrContract = getLiquidityManagerContractOnContext(
    ctx,
    liquidityManagerAddresses[ctx.chainId]
  );
  let owner = "noone";
  try {
    owner = await liqMgrContract.ownerOf(tokenId);
  } catch (e) {
    if (e?.message.includes("ERC721: owner query for nonexistent token")) {
      return undefined;
    }
  }

  const liq = await liqMgrContract.liquidities(tokenId);

  const poolContract = getIZiSwapPoolContractOnContext(ctx, poolAddress);
  const rawState = await poolContract.state();
  const state = {
    currentPoint: Number(rawState.currentPoint),
    liquidity: rawState.liquidity.toString(),
    liquidityX: rawState.liquidityX.toString(),
    sqrtPrice_96: rawState.sqrtPrice_96.toString(),
    observationCurrentIndex: Number(rawState.observationCurrentIndex),
    observationQueueLen: Number(rawState.observationQueueLen),
    observationNextQueueLen: Number(rawState.observationNextQueueLen),
  };

  const inpLiq = {
    tokenId,
    leftPoint: Number(liq.leftPt),
    rightPoint: Number(liq.rightPt),
    liquidity: liq.liquidity.toString(),
    state,
    lastFeeScaleX_128: "",
    lastFeeScaleY_128: "",
    remainTokenX: "",
    remainTokenY: "",
    tokenX: {
      chainId: 0,
      symbol: "",
      address: "",
      decimal: 0,
    },
    tokenY: {
      chainId: 0,
      symbol: "",
      address: "",
      decimal: 0,
    },
    amountX: "0",
    amountY: "0",
    poolId: "",
    poolAddress: "",
    fee: 0,
  };
  const { amountX, amountY } = getLiquidityValue(inpLiq, state);
  const stoneBalance = BigInt(
    (poolInfo.tokenXIsStone ? amountX : amountY).toFixed(0)
  );

  const newSnapshot = new PositionSnapshot({
    id: tokenId,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    poolAddress,
    owner,
    stoneBalance,
  });

  ctx.eventLogger.emit("point_update", {
    account: newSnapshot.owner,
    tokenId,
    points,
    poolAddress,
    triggerEvent,
    snapshotOwner: snapshot?.owner ?? "noone",
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    snapshotStoneBalance: snapshot?.stoneBalance ?? 0n,
    newOwner: newSnapshot.owner,
    newTimestampMilli: newSnapshot.timestampMilli,
    newStoneBalance: newSnapshot.stoneBalance,
  });
  return newSnapshot;
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
  const stoneBalance = snapshot.stoneBalance;

  const points = stoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
