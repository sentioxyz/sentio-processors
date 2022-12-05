import {
  BaseCoinInfoWithBridge,
  calculateValueInUsd,
  CORE_TOKENS,
  getPrice,
  scaleDown
} from "@sentio-processor/common/dist/aptos";
import { aptos, Counter, Gauge } from "@sentio/sdk";
import { aggregator, coin, managed_coin, optional_aggregator } from "@sentio/sdk/lib/builtin/aptos/0x1";
import { delay, getRandomInt } from "@sentio-processor/common/dist";
import type { Transaction_UserTransaction, TransactionPayload_EntryFunctionPayload } from 'aptos-sdk/src/generated'
import { getPriceByType } from "@sentio/sdk/lib/utils/price";
import { APTOS_MAINNET_ID } from "@sentio/sdk/lib/utils/chain";
import { AptosClient } from "aptos-sdk";
import { TYPE_REGISTRY } from "@sentio/sdk/lib/aptos";

const accounts = Counter.register("account", { sparse: true })
const accountBalance = Gauge.register("account_balance", { sparse: true })

const BRIDGE_TOKENS = new Map<string, BaseCoinInfoWithBridge>()
const PRICES = new Map<string, number>()

const date = new Date(2022,11,1)

for (const token of CORE_TOKENS.values()) {
  if (token.bridge === "native") {
    continue
  }

  BRIDGE_TOKENS.set(token.token_type.type, token)

  getPriceByType(APTOS_MAINNET_ID, token.token_type.type, date).then((price) => {
    PRICES.set(token.token_type.type, price)
    console.log("price", token.token_type.type, price)
  })
}

const client = new AptosClient("https://aptos-mainnet.nodereal.io/v1/0c58c879d41e4eab8fd2fc0406848c2b/v1")

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


TYPE_REGISTRY.load(coin.ABI)
managed_coin.bind()
    .onEntryRegister(async (call, ctx) => {
      const token = BRIDGE_TOKENS.get(call.type_arguments[0])
      if (!token) {
        console.log("skip")
        return
      }
      ctx.logger.info("account_creation", {token: token.symbol, bridge: token.bridge, account:ctx.transaction.sender})

      const coinStore = `0x1::coin::CoinStore<${token.token_type.type}>`;

      const res = await client.getAccountResource(ctx.transaction.sender, coinStore)
      const decodedRes = TYPE_REGISTRY.decodeResource<coin.CoinStore<any>>(res)
      if (!decodedRes) {
        console.log(res)
        process.exit(1)
        return
      }
      const amount = scaleDown(decodedRes.data_typed.coin.value, token.decimals)
      const value = amount.multipliedBy(PRICES.get(token.token_type.type)!)

      accounts.add(ctx, 1, {token: token.symbol, condition: "all"})
      if (value.isGreaterThan(0)) {
        accounts.add(ctx, 1, {token: token.symbol, condition: "gt_0"})
      }
      if (value.isGreaterThan(10)) {
        accounts.add(ctx, 1, {token: token.symbol, condition: "gt_10"})
      }

      // accounts.add(ctx, 1, { kind: "account_creation", token: call.type_arguments[0] })
    })
