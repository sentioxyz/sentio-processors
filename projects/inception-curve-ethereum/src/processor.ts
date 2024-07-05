
import { AccountSnapshot } from './schema/schema.js'

import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import {
  CurveStableSwapNGContext,
  CurveStableSwapNGProcessor,
  getCurveStableSwapNGContract,
} from "./types/eth/curvestableswapng.js";
import { getCurveGaugeContractOnContext } from "./types/eth/curvegauge.js";
import {
  map, NETWORK,
  PoolInfo
} from "./config.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true
}

for (const key in map) {
  if (map.hasOwnProperty(key)) {
    const poolInfo = map[key]
    CurveStableSwapNGProcessor.bind({
      address: poolInfo.poolAddress,
      network: NETWORK,
      baseLabels: { token: key }
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
              return processAccount(ctx, snapshot.account, "TimeInterval")
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
                return processAccount(ctx, snapshot.account, "TimeInterval")
              return Promise.resolve()
            })
          )
        },
        4 * 60,
        4 * 60
      )
  }
}


// accountSnapshot is null if snapshot hasn't been taken for this account yet
async function processAccount(
  ctx: CurveStableSwapNGContext,
  accountAddress: string,
  triggerEvent: string
) {
  const accountSnapshot = await ctx.store.get(AccountSnapshot, `${accountAddress}-${ctx.address}`);
  const points = accountSnapshot
    ? calcPoints(ctx, accountSnapshot)
    : new BigDecimal(0);

  const latestAccountSnapshot = await getLatestAccountSnapshot(ctx, accountAddress)


  const newAccountSnapshot = new AccountSnapshot(latestAccountSnapshot)
  await ctx.store.upsert(newAccountSnapshot)


  ctx.eventLogger.emit("point_update", {
    account: accountAddress,
    triggerEvent,
    points,
    snapshotTimestampMilli: accountSnapshot?.timestampMilli ?? 0,
    snapshotLptBalance: accountSnapshot?.lptBalance ?? "0",
    snapshotLptSupply: accountSnapshot?.lptSupply ?? "0",
    snapshotPoolInceptionETHBalance: accountSnapshot?.poolInceptionETHBalance ?? "0",
    snapshotPoolWETHBalance: accountSnapshot?.poolWETHBalance ?? "0",
    newTimestampMilli: latestAccountSnapshot.timestampMilli,
    newLptBalance: latestAccountSnapshot.lptBalance,
    newLptSupply: latestAccountSnapshot.lptSupply,
    newPoolInceptionETHBalance: latestAccountSnapshot.poolInceptionETHBalance,
    newPoolWETHBalance: latestAccountSnapshot.poolWETHBalance,
  })
}

function calcPoints(
  ctx: CurveStableSwapNGContext,
  accountSnapshot: AccountSnapshot
): BigDecimal {
  const nowMilli = ctx.timestamp.getTime();
  if (nowMilli < Number(accountSnapshot.timestampMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      accountSnapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == Number(accountSnapshot.timestampMilli)) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const { lptBalance, lptSupply, poolInceptionETHBalance, poolWETHBalance } =
    accountSnapshot
  const poolShare = BigInt(lptBalance)
    .asBigDecimal()
    .div(BigInt(lptSupply).asBigDecimal())

  const accountInceptionETHBalance = poolShare.multipliedBy(
    BigInt(poolInceptionETHBalance).scaleDown(TOKEN_DECIMALS)
  );
  const accountWETHBalance = poolShare.multipliedBy(
    BigInt(poolWETHBalance).scaleDown(TOKEN_DECIMALS)
  )

  const points = accountInceptionETHBalance.multipliedBy(deltaHour);

  return points
}

async function getLatestAccountSnapshot(
  ctx: CurveStableSwapNGContext,
  accountAddress: string
) {
  let lptBalance = await ctx.contract.balanceOf(accountAddress)
  const poolInfo = findPoolInfo(ctx.address)
  if (poolInfo?.gaugeExists && ctx.blockNumber > poolInfo.gaugeStartBlock) {
    const gaugeContract = getCurveGaugeContractOnContext(ctx, poolInfo.gaugeAddress)
    lptBalance += await gaugeContract.balanceOf(accountAddress)

    const gaugeBal = await gaugeContract.balanceOf(accountAddress)
    console.log("gaugeContract balance", ctx.blockNumber, gaugeBal)

  }
  const lptSupply = await ctx.contract.totalSupply()
  const [poolInceptionETHBalance, poolWETHBalance] = await ctx.contract.get_balances();

  return {
    id: `${accountAddress}-${ctx.address}`,
    account: accountAddress,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    lptBalance: lptBalance.toString(),
    lptSupply: lptSupply.toString(),
    poolInceptionETHBalance: poolInceptionETHBalance.toString(),
    poolWETHBalance: poolWETHBalance.toString()
  }
}

function isProtocolAddress(address: string): boolean {
  if (isNullAddress(address)) return true
  for (const key in map) {
    if (map.hasOwnProperty(key)) {
      const poolInfo = map[key];
      if (poolInfo.poolAddress === address || poolInfo.gaugeAddress === address) {
        return true
      }
    }
  }
  return false
}


function findPoolInfo(address: string): PoolInfo | null {
  for (const key in map) {
    if (map.hasOwnProperty(key)) {
      const poolInfo = map[key];
      if (poolInfo.poolAddress === address) {
        return poolInfo
      }
    }
  }
  return null
}

