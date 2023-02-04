import {
  BaseCoinInfoWithBridge,
  calculateValueInUsd,
  CORE_TOKENS,
  getPrice,
  scaleDown
} from "@sentio-processor/common/dist/aptos";
import { AccountEventTracker, Counter, Gauge } from "@sentio/sdk";
import {
  aggregator,
  coin,
  account,
  managed_coin,
  optional_aggregator,
  type_info
} from "@sentio/sdk-aptos/lib/builtin/0x1";
import { delay, getRandomInt } from "@sentio-processor/common/dist";
import type { Transaction_UserTransaction, TransactionPayload_EntryFunctionPayload } from 'aptos-sdk/src/generated'
import { getPriceByType } from "@sentio/sdk/lib/utils/price";
import { CHAIN_IDS } from "@sentio/sdk";
import { AptosClient } from "aptos-sdk";
import { defaultMoveCoder, getAptosClient } from "@sentio/sdk-aptos";

const accounts = Counter.register("account", { sparse: false })
const accountBalance = Gauge.register("account_balance", { sparse: true })
const accountTracer = AccountEventTracker.register("register_coin_events")

const BRIDGE_TOKENS = new Map<string, BaseCoinInfoWithBridge>()
const PRICES = new Map<string, number>()

const date = new Date(2022,11,1)

for (const token of CORE_TOKENS.values()) {
  if (token.bridge === "native") {
    continue
  }

  BRIDGE_TOKENS.set(token.token_type.type, token)

  getPriceByType(CHAIN_IDS.APTOS_MAINNET, token.token_type.type, date).then((price) => {
    PRICES.set(token.token_type.type, price)
    console.log("price", token.token_type.type, price)
  })
}

const client = getAptosClient()!

//
// coin.bind().onEventDepositEvent(async (evt, ctx) => {
//   const payload = ctx.transaction.payload as TransactionPayload_EntryFunctionPayload
//   const token = BRIDGE_TOKENS.get(payload.type_arguments[0])
//   if (!token) {
//     return
//   }
//
//   const amount = scaleDown(evt.data_typed.amount, token.decimals)
//   const value = amount.multipliedBy(PRICES.get(token.token_type.type)!)
//
//   // const value = await calculateValueInUsd(evt.data_typed.amount, token, priceTimestamp)
//   if (!value.isGreaterThan(0)) {
//     return
//   }
//
//   ctx.logger.info("deposit", {value: value.toNumber(), token: token.symbol, bridge: token.bridge, account: evt.guid.account_address})
// }).onEventWithdrawEvent(async (evt, ctx) => {
//   const payload = ctx.transaction.payload as TransactionPayload_EntryFunctionPayload
//   const token = BRIDGE_TOKENS.get(payload.type_arguments[0])
//   if (!token) {
//     return
//   }
//
//   const amount = scaleDown(evt.data_typed.amount, token.decimals)
//   const value = amount.multipliedBy(PRICES.get(token.token_type.type)!)
//   // const value = await calculateValueInUsd(evt.data_typed.amount, token, priceTimestamp)
//   if (!value.isGreaterThan(0)) {
//     return
//   }
//   ctx.logger.info("withdraw", {value: value.negated().toNumber(), token: token.symbol, bridge: token.bridge, account: evt.guid.account_address})
// })


defaultMoveCoder().load(coin.ABI)
account.bind().onEventCoinRegisterEvent(async (call, ctx) => {
    // .onEntryRegister(async (call, ctx) => {
    const type = extractTypeName(call.data_typed.type_info)
  const accountAddress  =  call.guid.account_address
    const token = BRIDGE_TOKENS.get(type)
    if (!token) {
      // console.log("skip")
      return
    }
    // ctx.logger.info("account_creation", {token: token.symbol, bridge: token.bridge, account:ctx.transaction.sender})

    const coinStore = `0x1::coin::CoinStore<${token.token_type.type}>`;

    const res = await client.getAccountResource(accountAddress, coinStore)
    const decodedRes = defaultMoveCoder().decodeResource<coin.CoinStore<any>>(res)
    if (!decodedRes) {
      console.log(res)
      process.exit(1)
      return
    }
    const amount = scaleDown(decodedRes.data_typed.coin.value, token.decimals)
    const value = amount.multipliedBy(PRICES.get(token.token_type.type)!)

    // if (token.symbol ==='SOL') {
    //   accountTracer.trackEvent(ctx, { distinctId: accountAddress})
    // }
    ctx.eventTracker.track("coin_register", {
      distinctId: accountAddress,
      "token": {
        "symbol": token.symbol,
        "bridge": token.bridge,
      },
      "amount": value.toNumber(),
    })

    // accounts.add(ctx, 1, {token: token.symbol, condition: "all", bridge: token.bridge})
    // if (value.isGreaterThan(0)) {
    //   accounts.add(ctx, 1, {token: token.symbol, condition: "gt_0", bridge: token.bridge})
    // }
    // if (value.isGreaterThan(10)) {
    //   accounts.add(ctx, 1, {token: token.symbol, condition: "gt_10", bridge: token.bridge})
    // }

    // accounts.add(ctx, 1, { kind: "account_creation", token: call.type_arguments[0] })
  })

function extractTypeName(typeInfo: type_info.TypeInfo) {
  return [typeInfo.account_address, hex_to_ascii(typeInfo.module_name), hex_to_ascii(typeInfo.struct_name)].join("::")
  // if (rawName.startsWith("Coin<")) {
  //   return rawName.substring(5, rawName.length - 1)
  // } else {
  //   return rawName
  // }
}

function hex_to_ascii(str1: String) {
  var hex  = str1.toString();
  if (hex.startsWith("0x")) {
    hex = hex.substring(2)
  }
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}