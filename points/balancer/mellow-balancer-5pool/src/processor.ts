import { GLOBAL_CONFIG } from "@sentio/runtime"
import { BigDecimal } from "@sentio/sdk"
import { VaultProcessor } from "./types/eth/vault.js"
import { getVaultContractOnContext } from "./types/eth/vault.js"
import { ERC20Processor } from "@sentio/sdk/eth/builtin"
import { EthContext, isNullAddress } from "@sentio/sdk/eth"
import { getBalancerGaugeContractOnContext } from "./types/eth/balancergauge.js"
import { getBalancerPoolContractOnContext } from "./types/eth/balancerpool.js"
import {
  NETWORK,
  POOL_ID,
  BPT_ADDRESS,
  GAUGE_ADDRESS,
  POOL_START_BLOCK,
  GAUGE_START_BLOCK,
  BALANCER_VAULT_ADDRESS,
  BALANCER_FEES_COLLECTOR_ADDRESS,
  TOKEN_DECIMALS,
  MILLISECOND_PER_HOUR,
  amphrETH_ADDRESS,
  rstETH_ADDRESS,
  wstETH_ADDRESS,
  re7LRT_ADDRESS,
  steakLRT_ADDRESS,
  MULTIPLIER
} from "./config.js"
import { AccountSnapshot } from "./schema/schema.js"
import { getPriceBySymbol } from "@sentio/sdk/utils"


GLOBAL_CONFIG.execution = {
  sequential: true
}

ERC20Processor.bind({
  network: NETWORK,
  address: BPT_ADDRESS,
}).onEventTransfer(async (event, ctx) => {
  const accounts = [event.args.from, event.args.to]

  // we only handle the case where people transfer BPTs to each other.
  // if either from or to is a protocol address,
  // it means the transfer is part of a joinPool or exitPool txn,
  // and they are handled more performantly by VaultProcessor.onEventPoolBalanceChanged,
  // so we skip.
  if (accounts.some(isProtocolAddress)) {
    return
  }

  await Promise.all(
    accounts.map(
      account => processAccount(ctx, account, event.name)
    )
  )
})

VaultProcessor.bind({
  network: NETWORK,
  address: BALANCER_VAULT_ADDRESS,
  startBlock: POOL_START_BLOCK,
})
  // upon joinPool/exitPool (they both emit PoolBalanceChanged event), an account's balances in the pool are updated
  // so we update the account's points
  .onEventPoolBalanceChanged(
    async (event, ctx) => {
      await processAccount(ctx, event.args.liquidityProvider, event.name)
    },
    VaultProcessor.filters.PoolBalanceChanged(POOL_ID),
  )
  // after each swap, the exchange rate between BPT and underlying assets changes
  // so we update everyone's points
  .onEventSwap(
    async (event, ctx) => {
      await processAllAccounts(ctx, event.name)
    },
    VaultProcessor.filters.Swap(POOL_ID),
  )
  .onTimeInterval(
    async (_, ctx) => {
      await processAllAccounts(ctx, 'TimeInterval')
    },
    4 * 60,
    4 * 60,
  )

async function processAllAccounts(ctx: EthContext, triggerEvent: string) {
  const snapshots = await ctx.store.list(AccountSnapshot, [])
  const promises = []
  for (const snapshot of snapshots) {
    promises.push(
      processAccount(ctx, snapshot.id.toString(), triggerEvent, snapshot)
    )
  }
  await Promise.all(promises)
}

async function processAccount(
  ctx: EthContext,
  account: string,
  triggerEvent: string,
  snapshot?: AccountSnapshot,
) {
  if (!snapshot) snapshot = await ctx.store.get(AccountSnapshot, account)

  const [mPoints, sPoints] = snapshot ? await calcPoints(ctx, snapshot) : [0n, 0n]

  const newSnapshot = await getLatestAccountSnapshot(ctx, account)


  ctx.eventLogger.emit("point_update", {
    account,
    mPoints: mPoints.scaleDown(TOKEN_DECIMALS),
    sPoints: sPoints.scaleDown(TOKEN_DECIMALS),

    snapshotAmphrEthBalance: snapshot?.amphrEthBalance.scaleDown(TOKEN_DECIMALS) ?? 0n,
    snapshotRstEthBalance: snapshot?.rstEthBalance.scaleDown(TOKEN_DECIMALS) ?? 0n,
    snapshotWstEthBalance: snapshot?.wstEthBalance.scaleDown(TOKEN_DECIMALS) ?? 0n,
    snapshotRe7LrtBalance: snapshot?.re7LrtBalance.scaleDown(TOKEN_DECIMALS) ?? 0n,
    snapshotSteakLrtBalance: snapshot?.steakLrtBalance.scaleDown(TOKEN_DECIMALS) ?? 0n,
    snapshotEpochMilli: snapshot?.epochMilli ?? 0n,

    newAmphrEthBalance: newSnapshot.amphrEthBalance.scaleDown(TOKEN_DECIMALS),
    newRstEthBalance: newSnapshot.rstEthBalance.scaleDown(TOKEN_DECIMALS),
    newWstEthBalance: newSnapshot.wstEthBalance.scaleDown(TOKEN_DECIMALS),
    newRe7LrtBalance: newSnapshot.re7LrtBalance.scaleDown(TOKEN_DECIMALS),
    newSteakLrtBalance: newSnapshot.steakLrtBalance.scaleDown(TOKEN_DECIMALS),
    newEpochMilli: newSnapshot.epochMilli,

    triggerEvent
  })

  await ctx.store.upsert(newSnapshot)

}

async function calcPoints(
  ctx: EthContext,
  snapshot: AccountSnapshot,
): Promise<[bigint, bigint]> {
  // this is a work around to the async handler issue

  const nowMilli = ctx.timestamp.getTime()
  if (nowMilli < Number(snapshot.epochMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      snapshot
    )
    return [0n, 0n]
  }

  const holdingTime = BigInt(nowMilli) - snapshot.epochMilli

  //TODO: add token price here

  const ethPrice = await getPriceBySymbol("ETH", ctx.timestamp)

  if (!ethPrice) {
    throw new Error(`can't get eth price at ${ctx.timestamp}`)
  }


  const amphrEthBalance = snapshot.amphrEthBalance
  const rstEthBalance = snapshot.rstEthBalance
  const wstEthBalance = snapshot.wstEthBalance
  const re7LrtBalance = snapshot.re7LrtBalance
  const steakLrtBalance = snapshot.steakLrtBalance

  //TODO: update after getting token price
  const sumBalances = amphrEthBalance + rstEthBalance + wstEthBalance + re7LrtBalance + steakLrtBalance

  const mPoints = calcPointsFromHolding(sumBalances, holdingTime, ethPrice) * MULTIPLIER
  const sPoints = calcPointsFromHolding(sumBalances, holdingTime, ethPrice)

  return [mPoints, sPoints]
}


function calcPointsFromHolding(
  amountTokenHolding: bigint,
  holdingPeriod: bigint,
  tokenPrice: number
): bigint {
  // 0.00025 points per hour per $1 dollar
  const priceFactor = 10 ** 12
  const ethPriceBigInt = BigInt(Math.round(tokenPrice * priceFactor))

  return amountTokenHolding * ethPriceBigInt / BigInt(priceFactor) * 25n / 100000n * holdingPeriod / MILLISECOND_PER_HOUR
}


async function getLatestAccountSnapshot(
  ctx: EthContext,
  account: string
): Promise<AccountSnapshot> {
  const vaultContract = getVaultContractOnContext(ctx, BALANCER_VAULT_ADDRESS)
  const poolContract = getBalancerPoolContractOnContext(
    ctx,
    BPT_ADDRESS
  )

  let bptBalance = await poolContract.balanceOf(account)
  if (ctx.blockNumber > GAUGE_START_BLOCK) {
    // gauge contract creation block
    const gaugeContract = getBalancerGaugeContractOnContext(
      ctx,
      GAUGE_ADDRESS
    )
    bptBalance += await gaugeContract.balanceOf(account)
  }
  const bptSupply = await poolContract.getActualSupply()
  // getPoolTokens returns: tokens address[], balances uint256[], lastChangeBlock uint256
  const [tokens, balances] =
    await vaultContract.getPoolTokens(POOL_ID)

  const amphrEthBalance = balances[tokens.indexOf(amphrETH_ADDRESS)] * bptBalance / bptSupply
  const rstEthBalance = balances[tokens.indexOf(rstETH_ADDRESS)] * bptBalance / bptSupply
  const wstEthBalance = balances[tokens.indexOf(wstETH_ADDRESS)] * bptBalance / bptSupply
  const re7LrtBalance = balances[tokens.indexOf(re7LRT_ADDRESS)] * bptBalance / bptSupply
  const steakLrtBalance = balances[tokens.indexOf(steakLRT_ADDRESS)] * bptBalance / bptSupply


  return new AccountSnapshot({
    id: account,
    epochMilli: BigInt(ctx.timestamp.getTime()),
    amphrEthBalance,
    rstEthBalance,
    wstEthBalance,
    re7LrtBalance,
    steakLrtBalance
  })
}

function isProtocolAddress(address: string): boolean {
  return (
    isNullAddress(address) ||
    address === BALANCER_VAULT_ADDRESS ||
    address === BALANCER_FEES_COLLECTOR_ADDRESS ||
    address === GAUGE_ADDRESS
  )
}
