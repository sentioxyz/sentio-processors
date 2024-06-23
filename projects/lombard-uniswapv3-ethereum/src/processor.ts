import { GLOBAL_CONFIG } from "@sentio/runtime"
import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth"
import { BigDecimal } from "@sentio/sdk"
import {
  NonfungiblePositionManagerProcessor,
  getNonfungiblePositionManagerContractOnContext,
} from "./types/eth/nonfungiblepositionmanager.js"
import { Pool, Position } from "@uniswap/v3-sdk"
import { Token } from "@uniswap/sdk-core"
import {
  UniswapV3PoolProcessor,
  getUniswapV3PoolContractOnContext,
} from "./types/eth/uniswapv3pool.js"
import {
  LBTC_ADDRESS,
  NETWORK,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  POOL_ADDRESS,
  POOL_FEE,
  START_BLOCK,
  WBTC_ADDRESS,
} from "./config.js"
import { PositionSnapshot } from "./schema/schema.js"

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24
const DAILY_POINTS = 2100
const MULTIPLIER = 4

interface PositionInfo {
  token0: string,
  token1: string,
  fee: number,
  tickLower: number,
  tickUpper: number,
  liquidity: string
}

interface PoolArgs {
  sqrtPriceX96: bigint,
  liquidity: bigint,
  tick: number
}

GLOBAL_CONFIG.execution = {
  sequential: true,
}


NonfungiblePositionManagerProcessor.bind({
  network: NETWORK,
  address: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  startBlock: START_BLOCK,
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)

    if (!(await isLbtcNFT(ctx, tokenId))) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name)
  })
  .onEventDecreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)

    if (!positionSnapshot) return
    if (!(await isLbtcNFT(ctx, tokenId))) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name)
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to]
    if (accounts.some(isNullAddress)) return

    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    if (!positionSnapshot) return
    if (!(await isLbtcNFT(ctx, tokenId))) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name)
  })



UniswapV3PoolProcessor.bind({
  network: NETWORK,
  address: POOL_ADDRESS,
})
  .onEventSwap(async (event, ctx) => {
    const { liquidity, sqrtPriceX96, tick } = event.args

    // const positionSnapshots = await db.asyncFind<PositionSnapshot>({
    //   tickLower: { $lte: tick },
    //   tickUpper: { $gte: tick },
    // })
    const positionSnapshots = ctx.store.list(PositionSnapshot)
    console.log("on event swap get ", JSON.stringify(positionSnapshots))

    try {
      const promises = []
      for await (const snapshot of positionSnapshots) {
        promises.push(processPosition(ctx, snapshot.id, snapshot, event.name, { liquidity, sqrtPriceX96, tick: Number(tick) })
        )
      }
      await Promise.all(promises)

    }
    catch (e) {
      console.log("on Swap Event error", e.message, ctx.transactionHash)
    }
  })
  .onTimeInterval(
    async (_, ctx) => {
      const positionSnapshots = ctx.store.list(PositionSnapshot)
      console.log("on time interval get ", JSON.stringify(positionSnapshots))

      try {
        const promises = [];
        for await (const snapshot of positionSnapshots) {
          promises.push(processPosition(ctx, snapshot.id, snapshot, "TimeInterval"));
        }
        await Promise.all(promises)
      }
      catch (e) {
        console.log("onTimeInterval error", e.message, ctx.timestamp)
      }
    },
    60,
    60
  )

// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: EthContext,
  tokenId: string,
  positionSnapshot: PositionSnapshot | undefined,
  triggerEvent: string,
  poolArgs?: PoolArgs | undefined
) {
  console.log("entering processPosition")
  if (triggerEvent == "TimeInterval") {
    console.log("entering processPosition TimeInterval")
  }
  const [bPoints, lPoints] = positionSnapshot
    ? calcPoints(ctx, positionSnapshot)
    : [new BigDecimal(0), new BigDecimal(0)]

  const pool = await getPool(ctx, poolArgs)
  const account = await getPositionOwner(ctx, tokenId)

  console.log("entering 2", poolArgs ?? "TimeInterval", pool.token0, poolArgs?.liquidity ?? 0, account, pool)


  try {
    // the position is not burned
    const latestPositionSnapshot = await getLatestPositionSnapshot(
      ctx,
      tokenId,
      pool
    )
    console.log("entering 3", latestPositionSnapshot, JSON.stringify(latestPositionSnapshot))

    await ctx.store.upsert(latestPositionSnapshot)

    const snapshotOwner = positionSnapshot?.owner ?? "none"
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0
    const snapshotLbtcBalance = positionSnapshot?.lbtcBalance.toString() ?? "0"
    const snapshotWbtcBalance = positionSnapshot?.wbtcBalance.toString() ?? "0"
    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      lbtcBalance: newLbtcBalance,
      wbtcBalance: newWbtcBalance,
    } = latestPositionSnapshot

    const log = {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      bPoints,
      lPoints,
      triggerEvent,
      // snapshot
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotLbtcBalance,
      snapshotWbtcBalance,
      // new
      newOwner,
      newTimestampMilli,
      newLbtcBalance,
      newWbtcBalance,
    }

    ctx.eventLogger.emit("point_update", log)
  } catch (e) {
    console.log(`process account error ${e.message} ${tokenId} ${ctx.transactionHash}`)

    if (e.message.includes("Invalid token ID")) {
      // the position is burned
      await ctx.store.delete(PositionSnapshot, tokenId)

      // since the txn burns the position, it is safe to assume positionSnapshot is not null
      const {
        owner: snapshotOwner,
        timestampMilli: snapshotTimestampMilli,
        lbtcBalance: snapshotLbtcBalance,
        wbtcBalance: snapshotWbtcBalance,
      } = positionSnapshot!

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        bPoints,
        lPoints,
        triggerEvent,
        // snapshot
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotLbtcBalance: snapshotLbtcBalance.toString(),
        snapshotWbtcBalance: snapshotWbtcBalance.toString(),
        // new
        newOwner: "none",
        newTimestampMilli: ctx.timestamp.getTime(),
        newLbtcBalance: "0",
        newWbtcBalance: "0",
      })
    }
  }
}

function calcPoints(
  ctx: EthContext,
  snapshot: PositionSnapshot
): [BigDecimal, BigDecimal] {
  const nowMilli = ctx.timestamp.getTime()
  const snapshotMilli = Number(snapshot.timestampMilli)
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshot
    )
    return [new BigDecimal(0), new BigDecimal(0)]
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return [new BigDecimal(0), new BigDecimal(0)]
  }
  const deltaDay = (nowMilli - snapshotMilli) / MILLISECOND_PER_DAY
  const { lbtcBalance, wbtcBalance } = snapshot

  const bPoints = BigDecimal(Number(lbtcBalance)).multipliedBy(deltaDay).multipliedBy(DAILY_POINTS)
  const lPoints = BigDecimal(Number(lbtcBalance)).multipliedBy(deltaDay).multipliedBy(MULTIPLIER).multipliedBy(DAILY_POINTS)

  return [bPoints, lPoints]
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  tokenId: string,
  pool: Pool,
): Promise<PositionSnapshot> {
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  )
  const owner = await getPositionOwner(ctx, tokenId)

  const position = new Position({ pool, tickLower, tickUpper, liquidity })
  const wbtcBalance = BigDecimal(position.amount0.toFixed())
  const lbtcBalance = BigDecimal(position.amount1.toFixed())

  console.log("got latest snapshot", tickLower, liquidity, wbtcBalance, lbtcBalance)

  ctx.eventLogger.emit("position_snapshot", {
    tokenId,
    owner,
    tickLower,
    tickUpper,
    liquidity,
    lbtcBalance,
    wbtcBalance,
    poolAddress: ctx.address,
  })


  return new PositionSnapshot({
    id: tokenId,
    owner,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    lbtcBalance,
    wbtcBalance
  })
}


async function getPositionInfo(
  ctx: EthContext,
  tokenId: string
): Promise<PositionInfo> {
  console.log("entering getPositionInfo", ctx.blockNumber, ctx.transactionHash)

  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
  )
  const positionResponse = await nfpmContract.positions(tokenId)
  console.log("getPositionInfo positionResponse", JSON.stringify(positionResponse))

  if (!positionResponse) {
    ctx.eventLogger.emit("position_info_get_error", {
      tokenId
    })
    throw new Error(`Position not found for tokenId: ${tokenId} ${ctx.transactionHash}`)
  }

  return {
    token0: positionResponse.token0,
    token1: positionResponse.token1,
    fee: Number(positionResponse.fee),
    tickLower: Number(positionResponse.tickLower),
    tickUpper: Number(positionResponse.tickUpper),
    liquidity: positionResponse.liquidity.toString(),
  }
}

async function getPool(
  ctx: EthContext,
  poolArgs?: PoolArgs
): Promise<Pool> {
  const token0 = new Token(
    Number(EthChainId.ETHEREUM),
    WBTC_ADDRESS,
    8,
    "WBTC",
    "WBTC"
  )
  const token1 = new Token(
    Number(EthChainId.ETHEREUM),
    LBTC_ADDRESS,
    8,
    "LBTC",
    "LBTC"
  )

  if (poolArgs) {
    console.log(`got pool args ${JSON.stringify(poolArgs)}`)
    return new Pool(token0, token1, POOL_FEE, poolArgs.sqrtPriceX96.toString(), poolArgs.liquidity.toString(), poolArgs.tick)
  } else {
    const poolContract = getUniswapV3PoolContractOnContext(ctx, POOL_ADDRESS)
    const liquidity = await poolContract.liquidity()
    const { sqrtPriceX96: rawSqrtPriceX96, tick: rawTick } =
      await poolContract.slot0()
    const sqrtPriceX96 = rawSqrtPriceX96.toString()
    const tick = Number(rawTick)
    // console.log("sqrtPriceX96", sqrtPriceX96, "tick", tick, "liquidity", liquidity)

    return new Pool(token0, token1, POOL_FEE, sqrtPriceX96, liquidity.toString(), tick)
  }
}

// check if the UniswapV3 NFT is for relevant pool
async function isLbtcNFT(ctx: EthContext, tokenId: string): Promise<boolean> {
  try {
    const positionResponse = await getPositionInfo(ctx, tokenId)

    if (positionResponse.token0.toLowerCase() === WBTC_ADDRESS.toLowerCase() &&
      positionResponse.token1.toLowerCase() === LBTC_ADDRESS.toLowerCase() &&
      positionResponse.fee === POOL_FEE) {
      return true
    }

  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    )
    return false
  }
  return false
}


async function getPositionOwner(
  ctx: EthContext,
  tokenId: string
): Promise<string> {
  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
  )
  return nfpmContract.ownerOf(tokenId)
}

