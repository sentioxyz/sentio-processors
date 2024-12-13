import { GLOBAL_CONFIG } from "@sentio/runtime"
import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth"
import { BigDecimal } from "@sentio/sdk"
import {
  NonfungiblePositionManagerProcessor,
  getNonfungiblePositionManagerContractOnContext,
} from "./types/eth/nonfungiblepositionmanager.js"
import { Pool, Position } from "@pancakeswap/v3-sdk"
import { Token } from "@pancakeswap/swap-sdk-core"
import {
  PancakeV3PoolProcessor,
  getPancakeV3PoolContractOnContext,
} from "./types/eth/pancakev3pool.js"
import { PositionSnapshot } from "./schema/store.js"
import { getPoolArgs, updatePoolArgs } from "./pool_args.js"
import { PancakeStakingBNBChainProcessor } from "./types/eth/pancakestakingbnbchain.js"

const NETWORK = EthChainId.BINANCE
const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS = "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"
const POOL_ADDRESS = "0x12197d7a4fE2d67F9f97ae64D82A44c24B7Ad407"
const TOKEN0_ADDRESS = "0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7" // SolvBTC
const TOKEN1_ADDRESS = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" // BTCB

const PANCAKE_STAKING_BNB = "0xb47b790076050423888cde9EBB2D5Cb86544F327"
const PANCAKE_MASTERCHEF_V3 = "0x556B9306565093C855AEA9AE92A594704c2Cd59e"
const POOL_START_BLOCK = 38539495
const POOL_FEE = 500

const MILLISECOND_PER_HOUR = 60 * 60 * 1000
const TOKEN_DECIMALS = 18

// represents response of NonfungiblePositionManager.positions(tokenId)
interface PositionInfo {
  token0: string
  token1: string
  fee: number
  tickLower: number
  tickUpper: number
  liquidity: string
}

GLOBAL_CONFIG.execution = {
  sequential: true,
}

NonfungiblePositionManagerProcessor.bind({
  network: NETWORK,
  address: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  startBlock: POOL_START_BLOCK,
})
  .onEventIncreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    if (!positionSnapshot && !(await checkNFT(ctx, tokenId))) return

    const newSnapshot = await processPosition(ctx, tokenId, positionSnapshot, event.name, undefined)
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot)
    }

    const poolArgs = await getPoolArgsFromChain(ctx)
    await updatePoolArgs(ctx, poolArgs)
  })
  .onEventDecreaseLiquidity(async (event, ctx) => {
    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    // specific NFT can be burned in the txn
    // then positions(tokenId) reverts and we will skip the event
    if (!positionSnapshot) return

    const newSnapshot = await processPosition(ctx, tokenId, positionSnapshot, event.name, undefined)
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot)
    }

    const poolArgs = await getPoolArgsFromChain(ctx)
    await updatePoolArgs(ctx, poolArgs)
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to]

    if (accounts.some(isNullAddress)) return
    //transfer btw staking contract and masterchef contract, skip
    if (accounts.some(isStakingAddress) && accounts.some(isMasterChefAddress)) return

    let triggerEvent = event.name
    let isStaked = undefined
    //staking: user address (!master chef contract address) transfer to staking contract address    
    if (!isMasterChefAddress(accounts[0]) && isStakingAddress(accounts[1])) {
      isStaked = true
      triggerEvent = "Stake"
    }
    //unstaking: staking contract address to user address (!master chef contractaddress)
    if (isStakingAddress(accounts[0]) && !isMasterChefAddress(accounts[1])) {
      isStaked = false
      triggerEvent = "Unstake"
    }

    const tokenId = event.args.tokenId.toString()
    const positionSnapshot = await ctx.store.get(PositionSnapshot, tokenId)
    if (!positionSnapshot) return

    const newSnapshot = await processPosition(ctx, tokenId, positionSnapshot, triggerEvent, isStaked)
    if (newSnapshot) {
      await ctx.store.upsert(newSnapshot)
    }
  })

PancakeV3PoolProcessor.bind({
  network: NETWORK,
  address: POOL_ADDRESS
})
  .onTimeInterval(
    async (_, ctx) => {
      const positionSnapshots = await ctx.store.list(PositionSnapshot, [])
      const newSnapshots = await Promise.all(
        positionSnapshots.map((snapshot) =>
          processPosition(ctx, snapshot.id.toString(), snapshot, "TimeInterval", undefined)
        )
      )
      const filteredSnapshots = newSnapshots.filter((s): s is PositionSnapshot => s !== undefined);
      await ctx.store.upsert(filteredSnapshots)
    },
    60,
    60
  )
  .onEventSwap(async (event, ctx) => {
    const { liquidity, sqrtPriceX96, tick } = event.args
    await updatePoolArgs(ctx, { liquidity, sqrtPriceX96, tick })
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
    ])
    const newSnapshots = await Promise.all(
      positionSnapshots.map((snapshot) =>
        processPosition(ctx, snapshot.id.toString(), snapshot, event.name, undefined)
      )
    )
    const filteredSnapshots = newSnapshots.filter((s): s is PositionSnapshot => s !== undefined);
    await ctx.store.upsert(filteredSnapshots)
  })


// Handles the position snapshot and point calculation
// If positionSnapshot is null, it means the position is created in the current txn
// If getLatestPositionSnapshot throws exception, it means the position is burned in the current txn
async function processPosition(
  ctx: EthContext,
  tokenId: string,
  positionSnapshot: PositionSnapshot | undefined,
  triggerEvent: string,
  staked: boolean | undefined
) {
  //follow previous snapshot isStaked value if there's no change action
  const isStaked = staked ?? (positionSnapshot?.isStaked ?? false)

  const xpPoints = positionSnapshot
    ? await calcPoints(ctx, positionSnapshot)
    : new BigDecimal(0)

  try {
    // the position is not burned
    const latestPositionSnapshot = await getLatestPositionSnapshot(ctx, tokenId, isStaked)

    const snapshotOwner = positionSnapshot?.owner ?? "none"
    const snapshotTimestampMilli = positionSnapshot?.timestampMilli ?? 0
    const snapshotSolvBtcBalance = positionSnapshot?.amount0 ?? "0"
    const snapshotBtcbBalance = positionSnapshot?.amount1 ?? "0"
    const snapshotIsStaked = positionSnapshot?.isStaked ?? false

    const {
      owner: newOwner,
      timestampMilli: newTimestampMilli,
      amount0: newSolvBtcBalance,
      amount1: newBtcbBalance,
      isStaked: newIsStaked
    } = latestPositionSnapshot

    ctx.eventLogger.emit("point_update", {
      account: positionSnapshot?.owner ?? latestPositionSnapshot.owner,
      tokenId,
      xpPoints,
      triggerEvent,
      snapshotOwner,
      snapshotTimestampMilli,
      snapshotSolvBtcBalance: snapshotSolvBtcBalance.toString(),
      snapshotBtcbBalance: snapshotBtcbBalance.toString(),
      snapshotIsStaked,

      newOwner,
      newTimestampMilli,
      newSolvBtcBalance: newSolvBtcBalance.toString(),
      newBtcbBalance: newBtcbBalance.toString(),
      newIsStaked
    })
    return latestPositionSnapshot
  } catch (e) {
    if (e.message.includes("Invalid token ID")) {
      // the position is burned
      await ctx.store.delete(PositionSnapshot, tokenId)
      ctx.timestamp

      // since the txn burns the position, it is safe to assume positionSnapshot is not null
      const {
        owner: snapshotOwner,
        timestampMilli: snapshotTimestampMilli,
        amount0: snapshotSolvBtcBalance,
        amount1: snapshotBtcbBalance,
      } = positionSnapshot!

      ctx.eventLogger.emit("point_update", {
        account: snapshotOwner,
        tokenId,
        xpPoints,
        triggerEvent,
        snapshotOwner,
        snapshotTimestampMilli,
        snapshotSolvBtcBalance: snapshotSolvBtcBalance.toString(),
        snapshotBtcbBalance: snapshotBtcbBalance.toString(),
        newOwner: "noone",
        newTimestampMilli: ctx.timestamp.getTime(),
        newSolvBtcBalance: "0",
        newBtcbBalance: "0",
      })
    }
  }
  return
}

async function calcPoints(
  ctx: EthContext,
  snapshot: PositionSnapshot
): Promise<BigDecimal> {
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
  const SolvBtcBalance = snapshot.amount0
  const BtcbBalance = snapshot.amount1

  const xpPoints = (BtcbBalance.plus(SolvBtcBalance)).multipliedBy(deltaHour)

  return xpPoints
}

// This method could throw exception if the position (tokenId) is burned
async function getLatestPositionSnapshot(
  ctx: EthContext,
  tokenId: string,
  isStaked: boolean
): Promise<PositionSnapshot> {
  const pool = await getPool(ctx)
  const { tickLower, tickUpper, liquidity } = await getPositionInfo(
    ctx,
    tokenId
  )
  const position = new Position({ pool, tickLower, tickUpper, liquidity })
  const amount0 = BigDecimal(position.amount0.toFixed())
  const amount1 = BigDecimal(position.amount1.toFixed())
  const owner = await getPositionOwner(ctx, tokenId)
  return new PositionSnapshot({
    id: tokenId,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    owner,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    amount0,
    amount1,
    isStaked
  })
}

async function getPool(ctx: EthContext): Promise<Pool> {
  const poolArgs =
    (await getPoolArgs(ctx)) ?? (await getPoolArgsFromChain(ctx))
  const token0 = new Token(
    Number(NETWORK),
    TOKEN0_ADDRESS,
    TOKEN_DECIMALS,
    "token0",
    "token0"
  )
  const token1 = new Token(
    Number(NETWORK),
    TOKEN1_ADDRESS,
    TOKEN_DECIMALS,
    "token1",
    "token1"
  )
  const { sqrtPriceX96, liquidity, tick } = poolArgs
  return new Pool(
    token0,
    token1,
    Number(POOL_FEE),
    sqrtPriceX96.toString(),
    liquidity.toString(),
    Number(tick)
  )
}

async function getPoolArgsFromChain(ctx: EthContext) {
  const poolContract = getPancakeV3PoolContractOnContext(ctx, POOL_ADDRESS)
  const liquidity = await poolContract.liquidity()
  const { sqrtPriceX96, tick } = await poolContract.slot0()
  return { sqrtPriceX96, liquidity, tick }
}

async function getPositionInfo(
  ctx: EthContext,
  tokenId: string
): Promise<PositionInfo> {
  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
  )
  const positionResponse = await nfpmContract.positions(tokenId)
  return {
    token0: positionResponse.token0,
    token1: positionResponse.token1,
    fee: Number(positionResponse.fee),
    tickLower: Number(positionResponse.tickLower),
    tickUpper: Number(positionResponse.tickUpper),
    liquidity: positionResponse.liquidity.toString(),
  }
}

async function getPositionOwner(
  ctx: EthContext,
  tokenId: string
): Promise<string> {
  const nfpmContract = getNonfungiblePositionManagerContractOnContext(
    ctx,
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
  )
  return await nfpmContract.ownerOf(tokenId)
}

// check if the PancakeV3 NFT is for the pool
async function checkNFT(ctx: EthContext, tokenId: string): Promise<boolean> {
  try {
    // positions(tokenId) call may fail
    const positionResponse = await getPositionInfo(ctx, tokenId)
    return (
      positionResponse.token0.toLowerCase() === TOKEN0_ADDRESS.toLowerCase() &&
      positionResponse.token1.toLowerCase() === TOKEN1_ADDRESS.toLowerCase() &&
      positionResponse.fee === 500
    )
  } catch (e) {
    console.error(
      `positions(${tokenId}) call failed at txn ${ctx.transactionHash}:`,
      e?.message
    )
    return false
  }
}


export function isStakingAddress(address: string) {
  try {
    return address === PANCAKE_STAKING_BNB
  } catch (error) {
    return false
  }
}

export function isMasterChefAddress(address: string) {
  try {
    return address === PANCAKE_MASTERCHEF_V3
  } catch (error) {
    return false
  }
}