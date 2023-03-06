import {CHAIN_IDS, Counter, Gauge, MetricOptions} from "@sentio/sdk";
import {getPriceBySymbol, getPriceByType} from "@sentio/sdk/utils";
import { aptos_coin, coin, managed_coin, resource_account, aptos_account } from "@sentio/sdk/aptos/builtin/0x1";
import {AptosDex, getCoinInfo, getPairValue} from "@sentio-processor/common/aptos";

import { DEFAULT_MAINNET_LIST, RawCoinInfo } from "@manahippo/coin-list";
import * as liquidswap from "./types/aptos/liquidswap.js";
import { amm } from "./types/aptos/auxexchange.js";
// import { TransactionPayload_EntryFunctionPayload } from "aptos-sdk/src/generated";
import { router, swap } from "./types/aptos/pancake-swap.js";
// import { token, token_transfers } from "@sentio/sdk/lib/builtin/aptos/0x3";
import {AptosContext, getChainQueryClient} from "@sentio/sdk/aptos";
import * as soffle3 from "./types/aptos/soffle3.js";
import * as topaz from "./types/aptos/topaz.js";
import * as bluemoves from "./types/aptos/bluemoves.js";
import * as tt from "./types/aptos/topaz.js";
import { AptosResourceContext, AptosAccountProcessor } from "@sentio/sdk/aptos";

const coinInfoMap = new Map<string, RawCoinInfo>()

for (const x of DEFAULT_MAINNET_LIST) {
    coinInfoMap.set(x.token_type.type, x)
}

async function handleTransfer(ctx: AptosContext, to: string, type: string, amount: bigint) {
    const info = coinInfoMap.get(type)
    if (info==undefined) return
    let symbol = info!
    let scaledAmount = amount.scaleDown(symbol.decimals)
    const ts = Number(ctx.transaction.timestamp) / 1000
    const date = new Date(ts)
        const tokenPrice = (await getPriceByType(CHAIN_IDS.APTOS_MAINNET,
            symbol.token_type.type, date))!
        if (tokenPrice == null) {
                console.log("null token0 price:" + symbol.symbol + " " + symbol.token_type.type)
            return
        }
        const ret = scaledAmount.multipliedBy(tokenPrice)
    if (ret.gt(1000)) {
        ctx.eventLogger.emit(
            "tokenTransfer",
            {
                from: ctx.transaction.sender,
                to: to,
                symbol: symbol.symbol,
                type: symbol.token_type.type,
                Value: ret,
            }
        )
    }
}

coin.bind({startVersion: 97000000})
    .onEntryTransfer(async (call, ctx) => {
        await handleTransfer(ctx, call.arguments_decoded[0], call.type_arguments[0], call.arguments_decoded[1])
    })

aptos_account.bind({startVersion: 97000000})
    .onEntryTransfer(async (call, ctx) => {
      await handleTransfer(ctx, call.arguments_decoded[0], "0x1::aptos_coin::AptosCoin", call.arguments_decoded[1])
    })


