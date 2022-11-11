import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";
import { aptos_coin, coin, managed_coin, resource_account, aptos_account } from "@sentio/sdk/lib/builtin/aptos/0x1";

import { DEFAULT_MAINNET_LIST, RawCoinInfo } from "@manahippo/coin-list/dist/list";
import { liquidity_pool, scripts } from "./types/aptos/liquidswap";
import { amm } from "./types/aptos/auxexchange";
import { TransactionPayload_EntryFunctionPayload } from "aptos-sdk/src/generated";
import { router, swap } from "./types/aptos/pancake-swap";
import { token, token_transfers } from "@sentio/sdk/lib/builtin/aptos/0x3";
import { getChainQueryClient } from "@sentio/sdk/lib/aptos/utils";
import * as soffle3 from "./types/aptos/soffle3";
import * as topaz from "./types/aptos/topaz";
import * as bluemoves from "./types/aptos/bluemoves";
import { AptosResourceContext } from "@sentio/sdk/lib/aptos";

const txnCounter = new Counter("txn_counter")

const coinInfoMap = new Map<string, RawCoinInfo>()

for (const x of DEFAULT_MAINNET_LIST) {
  coinInfoMap.set(x.token_type.type, x)
}

// resource_account.bind()
//   .onEntryCreateResourceAccount((call, ctx) => {
//     txnCounter.add(ctx, 1, { kind: "account_creation_2"})
//   })
//   .onEntryCreateResourceAccountAndFund((call, ctx) => {
//     txnCounter.add(ctx, 1, { kind: "account_creation"})
//   })
//   .onEntryCreateResourceAccountAndPublishPackage((call, ctx) => {
//     txnCounter.add(ctx, 1, { kind: "account_creation"})
//   })

managed_coin.bind()
  .onEntryRegister((call, ctx) => {
    txnCounter.add(ctx, 1, { kind: "register"})
  })

coin.bind()
  .onEntryTransfer((call, ctx) => {
    const info = coinInfoMap.get(call.type_arguments[0])
    let symbol = info ? info.symbol : "others"
    txnCounter.add(ctx, 1, { kind: "transfer", symbol})
  })

aptos_account.bind()
    .onEntryCreateAccount((call, ctx) => {
      txnCounter.add(ctx, 1, { kind: "account_creation"})
    })
    .onEntryTransfer((call, ctx) => {
      txnCounter.add(ctx, 1, { kind: "transfer", symbol: "native" })
    })
//
// token_transfers.bind()
//     .onTransaction((txn, ctx) => {
//       txnCounter.add(ctx, 1, { kind: "transfer", symbol: 'nft' })
//     })

// token.bind()
//   .onTransaction((txn, ctx) => {
//     txnCounter.add(ctx, 1, { kind: "nft"})
//   })

// swaps
scripts.bind()
  .onTransaction((tx, ctx) => {
    txnCounter.add(ctx, 1, { kind: "swap", protocol: "liquidswap"})
  })

amm.bind()
  .onTransaction((tx, ctx) => {
    txnCounter.add(ctx, 1, { kind: "swap", protocol: "aux"})
  })

router.bind()
  .onTransaction((tx, ctx) => {
    txnCounter.add(ctx, 1, { kind: "swap", protocol: "pancake"})
  })

// nft
for (const m of [soffle3.Aggregator, soffle3.token_coin_swap, soffle3.FixedPriceMarket, soffle3.FixedPriceMarketScript]) {
  m.bind()
    .onTransaction((tx, ctx) => {
      txnCounter.add(ctx, 1, { kind: "nft", protocol: "souffl3"})
    })
}

for (const m of [topaz.fees, topaz.inbox, topaz.events, topaz.bid_any, topaz.marketplace, topaz.marketplace_v2,
    topaz.collection_marketplace, topaz.token_coin_swap]) {
  m.bind()
    .onTransaction((tx, ctx) => {
      txnCounter.add(ctx, 1, { kind: "nft", protocol: "topaz"})
    })
}

for (const m of [bluemoves.marketplaceV2, bluemoves.offer_lib]) {
  m.bind()
    .onTransaction((tx, ctx) => {
      txnCounter.add(ctx, 1, { kind: "nft", protocol: "bluemoves"})
    })
}

const dailyTxn = new Gauge("txn");
const queryClient = getChainQueryClient()

aptos.AptosAccountProcessor.bind({address: "0x1"})
    .onTimeInterval(async (resources, ctx) => sync(ctx),
        24 * 60)

async function sync(ctx: AptosResourceContext) {
  interface myRow {
    num_failed_txns: number;
    num_successful_txns: number;
    num_total_txns: number;
  }
  const sql = `SELECT  COUNT_IF(success=false) AS num_failed_txns,
                     COUNT_IF(success=true) AS num_successful_txns,
                     COUNT(*) AS num_total_txns 
              FROM txns WHERE TIMESTAMP between ${(ctx.timestampInMicros - 86400000000).toString()}
             AND ${ctx.timestampInMicros.toString()}`
  // console.log(sql)
  let ret = await queryClient.aptosSQLQuery({
    sql: sql,
    network: "aptos_mainnet",
    arbitraryRange: true,
  })
  // console.log(ret)
  for (let row of ret.documents) {
    let obj: myRow = JSON.parse(row)
    dailyTxn.record(ctx, obj.num_failed_txns, { kind: "failed"})
    dailyTxn.record(ctx, obj.num_successful_txns, { kind: "successful"})
    dailyTxn.record(ctx, obj.num_total_txns, { kind: "total"})
  }
}