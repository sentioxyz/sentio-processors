
import { AccountSnapshot } from './schema/schema.js'

import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import {
  CurveTwocryptoOptimizedContext,
  CurveTwocryptoOptimizedProcessor
} from "./types/eth/curvetwocryptooptimized.js";
import { getCurveGaugeContractOnContext } from "./types/eth/curvegauge.js";
import {
  GAUGE_ADDRESS,
  GAUGE_EXISTS,
  GAUGE_START_BLOCK,
  MELLOW_MULTIPLIER,
  NETWORK,
  POINTS_PER_HOUR,
  POOL_ADDRESS,
} from "./config.js";
import { getPriceBySymbol } from '@sentio/sdk/utils';

const MILLISECOND_PER_HOUR = 60 * 60 * 1000
const TOKEN_DECIMALS = 18

GLOBAL_CONFIG.execution = {
  sequential: true
}


CurveTwocryptoOptimizedProcessor.bind({
  address: POOL_ADDRESS,
  network: NETWORK,
})
  .onEventAddLiquidity(async (event, ctx) => {
    const accountAddress = event.args.provider;
    const accounts = [accountAddress].filter((account) => !isNullAddress(account));
    await Promise.all(
      accounts.map((account) => processAccount(ctx, account, event.name))
    )
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const accountAddress = event.args.provider
    const accounts = [accountAddress].filter((account) => !isNullAddress(account));
    await Promise.all(
      accounts.map((account) => processAccount(ctx, account, event.name))
    )
  })
  .onEventTokenExchange(async (event, ctx) => {
    const accountSnapshots = await ctx.store.list(AccountSnapshot, []);
    await Promise.all(
      accountSnapshots.map((snapshot) => {
        //check corresponding pool only
        if (snapshot.id.includes(ctx.address))
          return processAccount(ctx, snapshot.id, "TimeInterval")
        return Promise.resolve()
      }
      )
    )
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.sender, event.args.receiver];

    // we only handle the case where people transfer LPTs to each other.
    if (accounts.some(isProtocolAddress)) {
      return
    }

    await Promise.all(
      accounts.map((account) => processAccount(ctx, account, event.name))
    );
  })
  .onTimeInterval(
    async (_, ctx) => {
      const accountSnapshots = await ctx.store.list(AccountSnapshot, []);
      await Promise.all(
        accountSnapshots.map((snapshot) => {
          //check corresponding pool only
          if (snapshot.id.includes(ctx.address))
            return processAccount(ctx, snapshot.id, "TimeInterval")
          return Promise.resolve()
        })
      )
    },
    4 * 60,
    4 * 60
  )


async function processAccount(
  ctx: CurveTwocryptoOptimizedContext,
  accountAddress: string,
  triggerEvent: string
) {
  const accountSnapshot = await ctx.store.get(AccountSnapshot, `${accountAddress}`);
  const [mPoints, sPoints, ezPoints] = accountSnapshot
    ? await calcPoints(ctx, accountSnapshot)
    : [new BigDecimal(0), new BigDecimal(0), new BigDecimal(0)];

  const latestAccountSnapshot = await getLatestAccountSnapshot(ctx, accountAddress)


  const newAccountSnapshot = new AccountSnapshot(latestAccountSnapshot)
  await ctx.store.upsert(newAccountSnapshot)


  ctx.eventLogger.emit("point_update", {
    account: accountAddress,
    triggerEvent,
    mPoints,
    sPoints,
    ezPoints,
    snapshotTimestampMilli: accountSnapshot?.timestampMilli ?? 0,
    snapshotLptBalance: accountSnapshot?.lptBalance ?? "0",
    snapshotLptSupply: accountSnapshot?.lptSupply ?? "0",
    snapshotPzEthBalance: accountSnapshot?.poolPzEthBalance ?? "0",
    snapshotPoolEzEthBalance: accountSnapshot?.poolEzEthBalance ?? "0",
    newTimestampMilli: latestAccountSnapshot.timestampMilli,
    newLptBalance: latestAccountSnapshot.lptBalance,
    newLptSupply: latestAccountSnapshot.lptSupply,
    newPoolPzEthBalance: latestAccountSnapshot.poolPzEthBalance,
    newPoolEzEthBalance: latestAccountSnapshot.poolEzEthBalance,
  })
}

async function calcPoints(
  ctx: CurveTwocryptoOptimizedContext,
  accountSnapshot: AccountSnapshot
): Promise<[BigDecimal, BigDecimal, BigDecimal]> {
  const nowMilli = ctx.timestamp.getTime();
  if (nowMilli < Number(accountSnapshot.timestampMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      accountSnapshot
    );
    return [new BigDecimal(0), new BigDecimal(0), new BigDecimal(0)];
  } else if (nowMilli == Number(accountSnapshot.timestampMilli)) {
    // account affected for multiple times in the block
    return [new BigDecimal(0), new BigDecimal(0), new BigDecimal(0)];
  }
  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const { lptBalance, lptSupply, poolEzEthBalance, poolPzEthBalance } =
    accountSnapshot

  const poolShare = BigInt(lptBalance)
    .asBigDecimal()
    .div(BigInt(lptSupply).asBigDecimal())

  const accountEzEthBalance = poolShare.multipliedBy(
    BigInt(poolEzEthBalance).scaleDown(TOKEN_DECIMALS)
  );
  const accountPzEthBalance = poolShare.multipliedBy(
    BigInt(poolPzEthBalance).scaleDown(TOKEN_DECIMALS)
  )

  // TODO: replace to pzETH price
  const ethPrice = await getPriceBySymbol("ETH", ctx.timestamp)

  if (!ethPrice) {
    throw new Error(`can't get eth price at ${ctx.timestamp}`)
  }

  const mPoints = accountPzEthBalance.multipliedBy(deltaHour).multipliedBy(ethPrice).multipliedBy(POINTS_PER_HOUR).multipliedBy(MELLOW_MULTIPLIER)
  const sPoints = accountPzEthBalance.multipliedBy(deltaHour).multipliedBy(ethPrice).multipliedBy(POINTS_PER_HOUR)
  const ezPoints = (accountPzEthBalance.plus(accountEzEthBalance)).multipliedBy(deltaHour)


  return [mPoints, sPoints, ezPoints]
}

async function getLatestAccountSnapshot(
  ctx: CurveTwocryptoOptimizedContext,
  accountAddress: string
) {
  let lptBalance = await ctx.contract.balanceOf(accountAddress)
  if (GAUGE_EXISTS && ctx.blockNumber > GAUGE_START_BLOCK) {
    const gaugeContract = getCurveGaugeContractOnContext(ctx, GAUGE_ADDRESS)
    lptBalance += await gaugeContract.balanceOf(accountAddress)

    const gaugeBal = await gaugeContract.balanceOf(accountAddress)
    console.log("gaugeContract balance", ctx.blockNumber, gaugeBal)

  }
  const lptSupply = await ctx.contract.totalSupply()
  const poolEzEthBalance = await ctx.contract.balances(0)
  const poolPzEthBalance = await ctx.contract.balances(1)


  return {
    id: `${accountAddress}`,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    lptBalance: lptBalance.toString(),
    lptSupply: lptSupply.toString(),
    poolEzEthBalance: poolEzEthBalance.toString(),
    poolPzEthBalance: poolPzEthBalance.toString()
  }
}

function isProtocolAddress(address: string): boolean {
  return (
    isNullAddress(address) ||
    address === POOL_ADDRESS ||
    (GAUGE_EXISTS && address === GAUGE_ADDRESS)
  );
}


