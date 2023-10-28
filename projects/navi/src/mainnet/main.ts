import {
  SuiContext,
  SuiObjectContext,
} from "@sentio/sdk/sui"
import { lending } from "../types/sui/0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca.js";
import { token } from "@sentio/sdk/utils"
import { ProtocolProcessor } from "./storage.js";
import { PoolProcessor } from "./pool.js";
import { OracleProcessor } from "./oracle.js";
import { AddressProcessor } from "./address.js";

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
  const symbol = metadata.symbol
  const decimal = metadata.decimals
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
  const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve

  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]

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


lending.bind()
  .onEventBorrowEvent(onEvent)
  .onEventDepositEvent(onEvent)
  .onEventRepayEvent(onEvent)
  .onEventWithdrawEvent(onEvent)
  .onEventLiquidationCallEvent(onLiquidationEvent)