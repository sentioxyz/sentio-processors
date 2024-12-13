import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthChainId, EthContext, EthFetchConfig } from "@sentio/sdk/eth";

import {
  CrocMicroBurnAmbientEvent,
  CrocMicroBurnRangeEvent,
  CrocMicroMintAmbientEvent,
  CrocMicroMintRangeEvent,
  CrocSwapDexContext,
  CrocSwapDexProcessor,
} from "./types/eth/crocswapdex.js";
import { AbiCoder, keccak256 } from "ethers";
import { getLockHolder } from "./lock_holder_utils.js";
import { getCrocQueryContractOnContext } from "./types/eth/crocquery.js";
import {
  AmbientPositionSnapshot,
  Pool,
  RangePositionSnapshot,
} from "./schema/store.js";
import { BigDecimal } from "@sentio/sdk";
import { getEigenRatio } from "./eigen_ratio.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const fetchConfig: EthFetchConfig = {
  transaction: true,
  transactionReceipt: false,
  transactionReceiptLogs: false,
  block: false,
  trace: false,
};

const TOKEN_DECIMALS = 18;

const STONE_ADDRESS = "0x80137510979822322193FC997d400D5A6C747bf7";
const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

const CROC_SWAP_DEX_ADDRESS = "0xaaaaaaaacb71bf2c8cae522ea5fa455571a74106";

const CROC_QUERY_ADDRESS = "0x62223e90605845Cf5CC6DAE6E0de4CDA130d6DDf";

const coder = new AbiCoder();

CrocSwapDexProcessor.bind({
  address: CROC_SWAP_DEX_ADDRESS,
  network: EthChainId.SCROLL,
  startBlock: 4898413, // first stone pool created
})
  .onEventCrocSwap(async (event, ctx) => {
    const pool = await getStonePool(
      ctx,
      event.args.base,
      event.args.quote,
      event.args.poolIdx
    );
    if (!pool) {
      return;
    }
    await handleSwap(ctx, pool, event.name);
  })
  .onEventCrocMicroSwap(async (event, ctx) => {
    const data = event.args.input;

    const CurveStateType = "tuple(uint128, uint128, uint128, uint64, uint64)";
    const SwapDirectiveType = "tuple(bool, bool, uint8, uint128, uint128)";
    const PoolType = "tuple(uint8, uint16, uint8, uint16, uint8, uint8, uint8)";
    const PoolCursorType = `tuple(${PoolType}, bytes32, address)`;

    const [, , , [, poolHash]] = coder.decode(
      [CurveStateType, "int24", SwapDirectiveType, PoolCursorType],
      data
    );
    const pool = await ctx.store.get(Pool, poolHash);
    if (!pool) {
      return;
    }
    await handleSwap(ctx, pool, event.name);
  })
  .onEventCrocHotCmd(async (event, ctx) => {
    // swap
    const data = event.args.input;
    const [base, quote, poolIdx] = coder.decode(
      ["address", "address", "uint256"],
      data
    );
    const pool = await getStonePool(ctx, base, quote, poolIdx);
    if (!pool) {
      return;
    }
    await handleSwap(ctx, pool, event.name);
  })
  .onEventCrocWarmCmd(
    async (event, ctx) => {
      // all commands are lp related
      const data = event.args.input;
      const [code, base, quote, poolIdx, lowTick, highTick] = coder.decode(
        [
          "uint8",
          "address",
          "address",
          "uint256",
          "int24",
          "int24",
          // omit unused fields
        ],
        data
      );
      const pool = await getStonePool(ctx, base, quote, poolIdx);
      if (!pool) {
        return;
      }
      const liqType = Math.floor(Number(code) / 10) || Number(code); // 1: mint range, 2: burn range, 3: mint ambient, 4: burn ambient
      if (liqType >= 0 && liqType < 3) {
        const [lockHolder] = await getLockHolder(ctx);
        const snapshot = await processRangePosition(
          ctx,
          pool,
          lockHolder,
          lowTick,
          highTick,
          event.name
        );
        await ctx.store.upsert(snapshot);
        return;
      }
      if (liqType >= 3 && liqType < 5) {
        const [lockHolder] = await getLockHolder(ctx);
        const snapshot = await processAmbientPosition(
          ctx,
          pool,
          lockHolder,
          event.name
        );
        await ctx.store.upsert(snapshot);
        return;
      }
    },
    undefined,
    fetchConfig
  )
  .onEventCrocMicroMintRange(handleMicroRangeLiqChange, undefined, fetchConfig)
  .onEventCrocMicroBurnRange(handleMicroRangeLiqChange, undefined, fetchConfig)
  .onEventCrocMicroMintAmbient(
    handleMicroAmbientLiqChange,
    undefined,
    fetchConfig
  )
  .onEventCrocMicroBurnAmbient(
    handleMicroAmbientLiqChange,
    undefined,
    fetchConfig
  )
  .onEventCrocColdCmd(async (event, ctx) => {
    // record pools
    const INIT_POOL_CODE = "47";
    const data = event.args.input;
    const code = data.slice(64, 66);
    if (code == INIT_POOL_CODE) {
      const [, base, quote, poolIdx] = coder.decode(
        ["uint8", "address", "address", "uint256", "uint128"],
        data
      );
      if (isStone(base) || isStone(quote)) {
        const poolHash = getPoolHash(base, quote, poolIdx);
        await ctx.store.upsert(
          new Pool({
            id: poolHash,
            base,
            quote,
            poolIdx,
          })
        );
      }
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

async function updateAll(ctx: CrocSwapDexContext, triggerEvent: string) {
  const rangeSnapshots = await ctx.store.list(RangePositionSnapshot, []);
  const ambientSnapshots = await ctx.store.list(AmbientPositionSnapshot, []);
  const snapshots = await Promise.all([
    ...rangeSnapshots.map(async (snapshot) => {
      const pool = await ctx.store.get(Pool, snapshot.poolHash);
      if (!pool) {
        throw new Error("pool not found");
      }
      return processRangePosition(
        ctx,
        pool,
        snapshot.owner,
        snapshot.lowTick,
        snapshot.highTick,
        triggerEvent
      );
    }),
    ...ambientSnapshots.map(async (snapshot) => {
      const pool = await ctx.store.get(Pool, snapshot.poolHash);
      if (!pool) {
        throw new Error("pool not found");
      }
      return processAmbientPosition(ctx, pool, snapshot.owner, triggerEvent);
    }),
  ]);
  await ctx.store.upsert(snapshots);
}

async function handleMicroRangeLiqChange(
  event: CrocMicroMintRangeEvent | CrocMicroBurnRangeEvent,
  ctx: CrocSwapDexContext
) {
  const [, , , , , , lowTick, highTick, , poolHash] = coder.decode(
    [
      "uint128",
      "int24",
      "uint128",
      "uint128",
      "uint64",
      "uint64",
      "int24",
      "int24",
      "uint128",
      "bytes32",
    ],
    event.args.input
  );
  const pool = await ctx.store.get(Pool, poolHash);
  if (!pool) {
    return;
  }
  const [lockHolder] = await getLockHolder(ctx);
  const snapshot = await processRangePosition(
    ctx,
    pool,
    lockHolder,
    lowTick,
    highTick,
    event.name
  );
  await ctx.store.upsert(snapshot);
}

async function handleMicroAmbientLiqChange(
  event: CrocMicroMintAmbientEvent | CrocMicroBurnAmbientEvent,
  ctx: CrocSwapDexContext
) {
  const [, , , , , , poolHash] = coder.decode(
    ["uint128", "uint128", "uint128", "uint64", "uint64", "uint128", "bytes32"],
    event.args.input
  );
  const pool = await ctx.store.get(Pool, poolHash);
  if (!pool) {
    return;
  }
  const [lockHolder] = await getLockHolder(ctx);
  const snapshot = await processAmbientPosition(
    ctx,
    pool,
    lockHolder,
    event.name
  );
  await ctx.store.upsert(snapshot);
}

async function handleSwap(
  ctx: CrocSwapDexContext,
  pool: Pool,
  triggerEvent: string
) {
  const rangeSnapshots = await ctx.store.list(RangePositionSnapshot, [
    {
      field: "poolHash",
      op: "=",
      value: pool.id.toString(),
    },
  ]);
  const ambientSnapshots = await ctx.store.list(AmbientPositionSnapshot, [
    {
      field: "poolHash",
      op: "=",
      value: pool.id.toString(),
    },
  ]);
  const snapshots = await Promise.all([
    ...rangeSnapshots.map((snapshot) =>
      processRangePosition(
        ctx,
        pool,
        snapshot.owner,
        snapshot.lowTick,
        snapshot.highTick,
        triggerEvent
      )
    ),
    ...ambientSnapshots.map((snapshot) =>
      processAmbientPosition(ctx, pool, snapshot.owner, triggerEvent)
    ),
  ]);
  await ctx.store.upsert(snapshots);
}

async function processRangePosition(
  ctx: CrocSwapDexContext,
  pool: Pool,
  owner: string,
  lowTick: bigint,
  highTick: bigint,
  triggerEvent: string
) {
  const id = `${owner}|${pool.id.toString()}|${lowTick}|${highTick}`;
  const snapshot = await ctx.store.get(RangePositionSnapshot, id);
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);
  const amountStone = await queryRangeStoneAmount(
    ctx,
    pool,
    owner,
    lowTick,
    highTick
  );
  const latestSnapshot = new RangePositionSnapshot({
    id,
    owner,
    poolHash: pool.id.toString(),
    lowTick,
    highTick,
    amountStone,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
  });
  ctx.eventLogger.emit("point_update", {
    type: "range",
    poolHash: pool.id.toString(),
    account: owner,
    points,
    lowTick,
    highTick,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotAmountStone: snapshot?.amountStone ?? 0,
    newTimestampMilli: latestSnapshot.timestampMilli,
    newAmountStone: latestSnapshot.amountStone,
    triggerEvent,
  });
  return latestSnapshot;
}

async function processAmbientPosition(
  ctx: CrocSwapDexContext,
  pool: Pool,
  owner: string,
  triggerEvent: string
) {
  const id = `${owner}|${pool.id.toString()}`;
  const snapshot = await ctx.store.get(AmbientPositionSnapshot, id);
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);
  const amountStone = await queryAmbientStoneAmount(ctx, pool, owner);
  const latestSnapshot = new AmbientPositionSnapshot({
    id,
    owner,
    poolHash: pool.id.toString(),
    amountStone,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
  });
  ctx.eventLogger.emit("point_update", {
    type: "ambient",
    poolHash: pool.id.toString(),
    account: owner,
    points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotAmountStone: snapshot?.amountStone ?? 0,
    newTimestampMilli: latestSnapshot.timestampMilli,
    newAmountStone: latestSnapshot.amountStone,
    triggerEvent,
  });
  return latestSnapshot;
}

async function calcPoints(
  ctx: CrocSwapDexContext,
  snapshot: { timestampMilli: bigint; amountStone: bigint }
) {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshot.timestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotMilli,
      snapshot.amountStone
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshot.amountStone
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}

async function queryRangeStoneAmount(
  ctx: CrocSwapDexContext,
  pool: Pool,
  owner: string,
  lowTick: bigint,
  highTick: bigint
) {
  if (!isStone(pool.base) && !isStone(pool.quote)) {
    throw new Error(`not stone pool: ${pool.id}`);
  }
  const q = getCrocQueryContractOnContext(ctx, CROC_QUERY_ADDRESS);
  const [, amountBase, amountQuote] = await q.queryRangeTokens(
    owner,
    pool.base,
    pool.quote,
    pool.poolIdx,
    lowTick,
    highTick
  );
  return isStone(pool.base) ? amountBase : amountQuote;
}

async function queryAmbientStoneAmount(
  ctx: CrocSwapDexContext,
  pool: Pool,
  owner: string
) {
  if (!isStone(pool.base) && !isStone(pool.quote)) {
    throw new Error(`not stone pool: ${pool.id}`);
  }
  const q = getCrocQueryContractOnContext(ctx, CROC_QUERY_ADDRESS);
  const [, amountBase, amountQuote] = await q.queryAmbientTokens(
    owner,
    pool.base,
    pool.quote,
    pool.poolIdx
  );
  return isStone(pool.base) ? amountBase : amountQuote;
}

async function getStonePool(
  ctx: EthContext,
  base: string,
  quote: string,
  poolIdx: bigint
) {
  if (!isStone(base) && !isStone(quote)) {
    return undefined;
  }
  const poolHash = getPoolHash(base, quote, poolIdx);
  return await ctx.store.get(Pool, poolHash);
}

function getPoolHash(base: string, quote: string, poolIdx: bigint) {
  return keccak256(
    coder.encode(["address", "address", "uint256"], [base, quote, poolIdx])
  );
}

function isStone(addr: any) {
  return (addr as string).toLowerCase() == STONE_ADDRESS.toLowerCase();
}
