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
  INSTETH_ADDRESS,
  NETWORK,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  POOL_ADDRESS,
  POOL_FEE,
  POOL_MAP,
  PoolInfo,
  START_BLOCK,
  WSTETH_ADDRESS,
} from "./config.js"
import { PositionSnapshot } from "./schema/schema.js"
import { ethers } from 'ethers'


const MILLISECOND_PER_HOUR = 60 * 60 * 1000

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
  startBlock: START_BLOCK
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    // if (ctx.transactionHash != "0xfb393c9746210e4a34de75d8e858ce2c7f262d3dd2d2ea1576306dba3be7a8d1") return
    // console.log("number of logs of tx ", ctx.transactionReceipt?.logs.length, ctx.transactionHash)

    // if (!(await isRelevantPool(ctx)))
    //   return

    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    const poolInfo = await findPoolInfo(ctx, tokenId)
    console.log("after poolInfo", poolInfo)
    if (!poolInfo) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name, poolInfo)
  }
    // , undefined, { transactionReceipt: true, transactionReceiptLogs: true }
  )
  .onEventDecreaseLiquidity(async (event, ctx) => {

    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)

    if (!positionSnapshot) return
    const poolInfo = await findPoolInfo(ctx, tokenId)
    if (!poolInfo) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name, poolInfo)
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to]
    if (accounts.some(isNullAddress)) return

    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    if (!positionSnapshot) return
    const poolInfo = await findPoolInfo(ctx, tokenId)
    if (!poolInfo) return
    await processPosition(ctx, tokenId, positionSnapshot, event.name, poolInfo)
  })


for (const key in POOL_MAP) {
  if (POOL_MAP.hasOwnProperty(key)) {
    const poolInfo = POOL_MAP[key]
    UniswapV3PoolProcessor.bind({
      network: NETWORK,
      address: poolInfo.poolAddress,
      baseLabels: { token: poolInfo.token }
    })
      .onEventSwap(async (event, ctx) => {
        const { liquidity, sqrtPriceX96, tick } = event.args

        // const positionSnapshots = await db.asyncFind<PositionSnapshot>({
        //   tickLower: { $lte: tick },
        //   tickUpper: { $gte: tick },
        // })
        const positionSnapshots = await ctx.store.list(PositionSnapshot, [])
        console.log("on event get ", JSON.stringify(positionSnapshots))

        try {
          const promises = []
          for (const snapshot of positionSnapshots) {
            if (snapshot.poolAddress == poolInfo.poolAddress)
              promises.push(processPosition(ctx, snapshot.id, snapshot, event.name, poolInfo, { liquidity, sqrtPriceX96, tick: Number(tick) }))
          }
          await Promise.all(promises)

        }
        catch (e) {
          console.log("on Swap Event error", e.message, ctx.transactionHash)
        }
      })
      .onTimeInterval(
        async (_, ctx) => {
          const positionSnapshots = await ctx.store.list(PositionSnapshot, [])
          console.log("on time interval get ", JSON.stringify(positionSnapshots))

          try {
            const promises = [];
            for (const snapshot of positionSnapshots) {
              if (snapshot.poolAddress == poolInfo.poolAddress)
                promises.push(processPosition(ctx, snapshot.id, snapshot, "TimeInterval", poolInfo));
            }
            await Promise.all(promises)
          }
          catch (e) {
            console.log("onTimeInterval error", e.message, ctx.timestamp)
          }
        },
        60,
        60 * 24 * 30
      )
  }
}
// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: EthContext,
  tokenId: string,
  positionSnapshot: PositionSnapshot | undefined,
  triggerEvent: string,
  poolInfo: PoolInfo,
  poolArgs?: PoolArgs | undefined
) {
  console.log("entering processPosition")
  if (triggerEvent == "TimeInterval") {
    console.log("entering processPosition TimeInterval")
  }
  const points = positionSnapshot
    ? calcPoints(ctx, positionSnapshot)
    : new BigDecimal(0)
  const pool = await getPool(ctx, poolInfo, poolArgs)
  const account = await getPositionOwner(ctx, tokenId)

  console.log("entering 2", poolArgs ?? "TimeInterval", pool.token0, poolArgs?.liquidity ?? 0, account, pool)


  try {
    // the position is not burned
    const latestPositionSnapshot = await getLatestPositionSnapshot(
      ctx,
      tokenId,
      pool,
      poolInfo
    )
    console.log("entering 3", latestPositionSnapshot, JSON.stringify(latestPositionSnapshot))

    await ctx.store.upsert(latestPositionSnapshot)

    const snapshotOwner = positionSnapshot?.owner ?? "none"
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0
    const snapshotInceptionETHBalance = positionSnapshot?.inceptionETHBalance.toString() ?? "0"
    const snapshotWETHBalance = positionSnapshot?.wETHBalance.toString() ?? "0"
    const snapshotPoolAddress = positionSnapshot?.poolAddress ?? "0x"
    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      inceptionETHBalance: newInceptionETHBalance,
      wETHBalance: newWETHBalance,
    } = latestPositionSnapshot

    const log = {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      points,
      triggerEvent,
      // snapshot
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotInceptionETHBalance,
      snapshotWETHBalance,
      snapshotPoolAddress,
      // new
      newOwner,
      newTimestampMilli,
      newInceptionETHBalance,
      newWETHBalance,
      token: poolInfo.token ?? "",
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
        inceptionETHBalance: snapshotInceptionETHBalance,
        wETHBalance: snapshotWETHBalance,
        poolAddress: snapshotPoolAddress
      } = positionSnapshot!

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        points,
        triggerEvent,
        // snapshot
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotInceptionETHBalance: snapshotInceptionETHBalance.toString(),
        snapshotWETHBalance: snapshotWETHBalance.toString(),
        snapshotPoolAddress,
        // new
        newOwner: "none",
        newTimestampMilli: ctx.timestamp.getTime(),
        newInceptionETHBalance: "0",
        newWETHBalance: "0",
      })
    }
  }
}

function calcPoints(
  ctx: EthContext,
  snapshot: PositionSnapshot
): BigDecimal {
  const nowMilli = ctx.timestamp.getTime()
  const snapshotMilli = Number(snapshot.timestampMilli)
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshot
    )
    return new BigDecimal(0)
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0)
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR
  const { inceptionETHBalance, wETHBalance } = snapshot

  const points = BigDecimal(Number(inceptionETHBalance)).multipliedBy(deltaHour)

  return points
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  tokenId: string,
  pool: Pool,
  poolInfo: PoolInfo,
): Promise<PositionSnapshot> {
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  )
  const owner = await getPositionOwner(ctx, tokenId)

  const position = new Position({ pool, tickLower, tickUpper, liquidity })
  const wETHBalance = poolInfo.token0InceptionEthToken ? BigDecimal(position.amount1.toFixed()) : BigDecimal(position.amount0.toFixed())
  const inceptionETHBalance = poolInfo.token0InceptionEthToken ? BigDecimal(position.amount0.toFixed()) : BigDecimal(position.amount1.toFixed())

  console.log("got latest snapshot", tokenId, poolInfo.token, tickLower, liquidity, wETHBalance, inceptionETHBalance)

  // ctx.eventLogger.emit("position_snapshot", {
  //   tokenId,
  //   owner,
  //   tickLower,
  //   tickUpper,
  //   liquidity,
  //   inceptionETHBalance,
  //   wETHBalance,
  //   poolAddress: ctx.address,
  //   token: poolInfo.token,
  // })


  return new PositionSnapshot({
    id: tokenId,
    owner,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    inceptionETHBalance,
    wETHBalance,
    poolAddress: poolInfo.poolAddress
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
  poolInfo: PoolInfo,
  poolArgs?: PoolArgs
): Promise<Pool> {
  const token0 = new Token(
    Number(EthChainId.ETHEREUM),
    poolInfo.token0,
    18,
    "token0",
    "token0"
  )
  const token1 = new Token(
    Number(EthChainId.ETHEREUM),
    poolInfo.token1,
    18,
    "token1",
    "token1"
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
async function findPoolInfo(ctx: EthContext, tokenId: string): Promise<PoolInfo | null> {


  try {
    const positionResponse = await getPositionInfo(ctx, tokenId)
    console.log("positionResponse in findPoolInfo", JSON.stringify(positionResponse))

    for (const key in POOL_MAP) {
      if (POOL_MAP.hasOwnProperty(key)) {
        const poolInfo = POOL_MAP[key]
        if (positionResponse.token0.toLowerCase() === poolInfo.token0.toLowerCase() &&
          positionResponse.token1.toLowerCase() === poolInfo.token1.toLowerCase() &&
          positionResponse.fee === poolInfo.fee) {
          console.log("find match poolInfo", poolInfo)

          return poolInfo
        }
      }
    }
  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    )
    return null
  }
  return null
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



async function isRelevantPool(ctx: EthContext): Promise<boolean> {
  const logs = ctx.transactionReceipt?.logs
  if (!logs) return false
  console.log("log length", logs.length)
  console.log("log0", ctx.transactionHash, logs[0].index, logs[0].address)
  console.log("log1", ctx.transactionHash, logs[1].index, logs[1].address)
  console.log("log6", ctx.transactionHash, logs[6].index, logs[6].address, isLogAddressInPool(logs[6].address))


  for (const log of logs) {
    if (isLogAddressInPool(log.address)) {
      //debug
      console.log("search", ctx.transactionHash, log.index, log.address, "found in pool")

      return true
    }
    else {
      //debug
      console.log("search", ctx.transactionHash, log.index, log.address, "not in pool")
    }
  }

  //debug
  console.log(ctx.transactionHash, "not in pool")
  return false
}


function isLogAddressInPool(logAddress: string): boolean {
  for (const key in POOL_MAP) {
    if (POOL_MAP.hasOwnProperty(key)) {
      const poolInfo = POOL_MAP[key]
      if (logAddress.toLowerCase() === poolInfo.poolAddress.toLowerCase()) {
        //debug
        console.log("isLogAddressInPool true", logAddress)
        return true
      }
      else {
        //debug
        console.log("isLogAddressInPool false", logAddress.toLowerCase(), poolInfo.poolAddress.toLowerCase())
      }
    }
  }
  return false
}