import {
  SuiContext,
  SuiObjectContext,
} from "@sentio/sdk/sui"
import { incentive_v2, lending, flash_loan } from "../types/sui/navxFlashLoan.js";
import { token } from "@sentio/sdk/utils"
import { ProtocolProcessor } from "./storage.js";
import { PoolProcessor } from "./pool.js";
import { OracleProcessor } from "./oracle.js";
import { AddressProcessor } from "./address.js";
import { scaleDown } from "@sentio/sdk";

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
  let coinInfo = coinInfoMap.get(coinAddress)
  if (!coinInfo) {
    coinInfo = buildCoinInfo(ctx, coinAddress)
    coinInfoMap.set(coinAddress, coinInfo)
    console.log("set coinInfoMap for " + coinAddress)
  }
  return await coinInfo
}

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
  const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
  //@ts-ignore
  const symbol = metadata.symbol
  //@ts-ignore
  const decimal = metadata.decimals
  //@ts-ignore
  const name = metadata.name
  console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
  return {
    symbol,
    name,
    decimal
  }
}

export type LendingEvent = lending.BorrowEventInstance | lending.DepositEventInstance | lending.WithdrawEventInstance | lending.RepayEventInstance

PoolProcessor()
ProtocolProcessor()
OracleProcessor()
AddressProcessor()

async function onEvent(event: LendingEvent, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  // const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve
  const Coins: any = {
    '0': "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    '1': "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    '2': "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    '3': "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    '4': "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    '5': "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    '6': "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    '7': "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX"
  }
  const coinAddress = Coins[reserve]
  // const coinAddress = event.data_decoded.pool;

  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]
  const coinDecimal = getOrCreateCoin(ctx, coinAddress)
  const amount = scaleDown(event.data_decoded.amount, (await coinDecimal).decimal)

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    amount,
    reserve,
    type,
    env: "mainnet"
  })
}

async function onLiquidationEvent(event: lending.LiquidationCallEventInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const liquidation_amount = event.data_decoded.liquidate_amount
  const liquidate_user = event.data_decoded.liquidate_user
  const reserve = event.data_decoded.reserve
  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    liquidation_amount,
    liquidate_user,
    reserve,
    type,
    env: "mainnet"
  })
}


// async function onRewardsClaimedEvent(event: incentive_v2.RewardsClaimedInstance, ctx: SuiContext) {

//   const Coins: any = {
//     "0xbb94b9f03ce414c3c26c9794c2113a4b287b0723ffbe285799f789abf72844e3":0,
//     "0x1d5acfb2972ca8777961d2f93d6419df02fa9ec179e24391bbc74b436ea08448":1,
//     "0xaa8251828fe6beed766d13b347d2789bb84594f825f59dd0e44653d46da3b9a2":2,
//     "0x342f963896542702564432236ad487685f4e6d918a0dfff587a0b5eeb2e2b214":3,
//     "0xd5f2755fefb3911a68cd5c253fc76027cfa1dd275781ba3621435ee5b184c9d0":4,
//     "0x493fe9365747b70d19a2ced9865aae5b59887dc1cbf21a3fdef2fb69c64d778f":5,
//     "0x9a7f58895dfc3a6c4eaf686a4216fd7483e985ba617f69844ba1e606cd6f7025":6,
//     "0x34b3c70773568d2cfeb3390c7ea6e0c72c4a4d39632b8fc42c36710c7e42954f":7
//   }
//   const coinAddress = Coins[event.data_decoded.pool]
//   const coinDecimal = getOrCreateCoin(ctx, coinAddress)
//   const amount = scaleDown(event.data_decoded.amount, (await coinDecimal).decimal)
//   const pool = event.data_decoded.pool
//   const sender = event.data_decoded.sender

//   const typeArray = event.type.split("::")
//   const type = typeArray[typeArray.length - 1]

//   ctx.eventLogger.emit("UserInteraction", {
//     distinctId: sender,
//     sender,
//     amount,
//     pool,
//     type,
//     env: "mainnet"
//   })
// }





async function flashLoanHandler(event: flash_loan.FlashLoanInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const amount = event.data_decoded.amount
  const asset:string = event.data_decoded.asset as string


  const FlashLoanCoins: Record<string, string> = {
    "0xb29922cca8fecabe2957833260e5a95fce343e5c299a2126414ae557fdac51a3": "USDC",
    "0xc6a2ed14c23907cba22b56fa84f7347aa36a0bb8feab47057f170860c55e7dbe": "vSui",
    "0x168728630433e1b2494e037b2d38801461260295e9ca38efed4157e1a9cc6b91": "Sui",
    "0xff307af2ebe087ca693a136a7cb6e767564c1498224b4fbb608df765743743ff": "USDT"
  }
  
  const coinType = FlashLoanCoins[asset] || "unknown";
  ctx.eventLogger.emit("flashloan", {
    sender: sender,
    amount: amount,
    asset: asset,
    coinType: coinType,
    env: "mainnet"
  })
}

async function flashoanRepayHandler(event: flash_loan.FlashRepayInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const amount = event.data_decoded.amount
  const asset = String(event.data_decoded.asset)

  const FlashLoanCoins: Record<string, string> = {
    "0xb29922cca8fecabe2957833260e5a95fce343e5c299a2126414ae557fdac51a3": "USDC",
    "0xc6a2ed14c23907cba22b56fa84f7347aa36a0bb8feab47057f170860c55e7dbe": "vSui",
    "0x168728630433e1b2494e037b2d38801461260295e9ca38efed4157e1a9cc6b91": "Sui",
    "0xff307af2ebe087ca693a136a7cb6e767564c1498224b4fbb608df765743743ff": "USDT"
  }

  const coinType = FlashLoanCoins[asset] || "unknown";
  ctx.eventLogger.emit("flashloanRepay", {
    sender: sender,
    coinType: coinType,
    amount: amount,
    fee_to_supplier: event.data_decoded.fee_to_supplier,
    fee_to_treasury: event.data_decoded.fee_to_treasury,
    env: "mainnet"
  })
}

async function depositOnBehalfOfHandler(event: lending.DepositOnBehalfOfEventInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const user = event.data_decoded.user
  const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "deposit"
  })
}

async function repayOnBehalfOfHandler(event: lending.RepayOnBehalfOfEventInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const user = event.data_decoded.user
  const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "repay"
  })
}

flash_loan.bind({ startCheckpoint: 28205630n })
  .onEventFlashLoan(flashLoanHandler)
  .onEventFlashRepay(flashoanRepayHandler)

lending.bind({startCheckpoint: 7800000n})
  .onEventBorrowEvent(onEvent)
  .onEventDepositEvent(onEvent)
  .onEventRepayEvent(onEvent)
  .onEventWithdrawEvent(onEvent)
  .onEventLiquidationCallEvent(onLiquidationEvent)
  .onEventDepositOnBehalfOfEvent(depositOnBehalfOfHandler)
  .onEventRepayOnBehalfOfEvent(repayOnBehalfOfHandler)

// incentive_v2.bind({startCheckpoint: 7800000n})
//   .onEventRewardsClaimed(onRewardsClaimedEvent)