import { BigDecimal, Counter, Gauge, scaleDown } from "@sentio/sdk";
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { AsyncNedb } from "nedb-async";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { EigenLSTRestakingContext, EigenLSTRestakingProcessor } from "./types/eth/eigenlstrestaking.js";
import { getStEthContractOnContext } from "./types/eth/steth.js";
import { AccountSnapshot } from "./schema/schema.js";

const TOKEN_DECIMALS = 18
// const MULTIPLIER_FACTOR = 1
const MILLISECOND_PER_HOUR = 60 * 60 * 1000

const stETH = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
const STAKESTONE_MANAGER = "0x87d004f22bdd5f9c85ad6d3f74f1fb6e7a256982"

GLOBAL_CONFIG.execution = {
  sequential: true
}




//TODO: only assumed stETH Deposit for restaking manager
EigenLSTRestakingProcessor.bind({
  address: STAKESTONE_MANAGER,
  network: EthChainId.ETHEREUM,
  startBlock: 19954474 //May-26-2024 01:53:59 PM +UTC
}).onEventDepositIntoStrategy(async (event, ctx) => {
  const accountSnapshot = await ctx.store.get(AccountSnapshot, STAKESTONE_MANAGER)
  await processAccount(ctx, STAKESTONE_MANAGER, accountSnapshot, "DepositIntoStrategy")
})
  .onEventWithdrawalCompleted(async (event, ctx) => {
    const accountSnapshot = await ctx.store.get(AccountSnapshot, STAKESTONE_MANAGER)
    await processAccount(ctx, STAKESTONE_MANAGER, accountSnapshot, "WithDrawCompleted")
  })
  .onTimeInterval(async (event, ctx) => {
    const accountSnapshot = await ctx.store.get(AccountSnapshot, STAKESTONE_MANAGER)
    await processAccount(ctx, STAKESTONE_MANAGER, accountSnapshot, "onTimeInterval")
  }, 60, 60)

async function processAccount(
  ctx: EigenLSTRestakingContext,
  accountAddress: string,
  accountSnapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  const elPoints = accountSnapshot ? calcPoints(ctx.timestamp.getTime(), accountSnapshot) : BigDecimal(0)
  const stEthNominal = (await ctx.contract.getRestakingValue()) + (await ctx.contract.getUnstakingValue())
  let stETHBalance = stEthNominal.scaleDown(18)

  const latestAccount = new AccountSnapshot({
    id: STAKESTONE_MANAGER,
    epochMilli: BigInt(ctx.timestamp.getTime()),
    stETHBalance: stETHBalance.toString()
  })



  await ctx.store.upsert(latestAccount)


  ctx.eventLogger.emit("point_update", {
    account: accountAddress,
    triggerEvent,
    elPoints,
    newEpochMilli: latestAccount.epochMilli,
    newStETHBalance: latestAccount.stETHBalance
  })
}

function calcPoints(
  nowMilli: number,
  accountSnapshot: AccountSnapshot
): BigDecimal {

  if (nowMilli <= accountSnapshot.epochMilli) {
    console.error(
      "unexpected account snapshot from the future",
      accountSnapshot
    );
    return new BigDecimal(0)
  }

  const deltaHour = (nowMilli - Number(accountSnapshot.epochMilli)) / MILLISECOND_PER_HOUR
  const { stETHBalance } = accountSnapshot

  const elPoints = BigDecimal(stETHBalance).times(BigDecimal(deltaHour))
  return elPoints
}

