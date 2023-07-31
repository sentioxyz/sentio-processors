import {
    SuiObjectProcessor,
    SuiContext,
    SuiObjectContext,
    SuiObjectProcessorTemplate,
    SuiWrappedObjectProcessor
} from "@sentio/sdk/sui"
// import * as constant from './constant-turbos.js'
import { ChainId } from "@sentio/chain"
import { BUILTIN_TYPES } from "@sentio/sdk/move"
import { BigDecimal, Gauge } from "@sentio/sdk";

import { lending } from "./types/sui/0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca.js";
import { getPriceBySymbol, token } from "@sentio/sdk/utils"
import { scaleDown } from "@sentio/sdk";

import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()


const reserves = [
    "0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf",
    "0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203",
    "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c"
]

const coin = ["sui", "usdc", "usdt"]
const DECIMAL = [9, 8, 8]

export type LendingEvent = lending.BorrowEventInstance | lending.DepositEventInstance | lending.WithdrawEventInstance | lending.RepayEventInstance

async function DepositHandler(event: LendingEvent, ctx: SuiContext) {
    const sender = event.data_decoded.sender
    const reserve = Number(event.data_decoded.reserve)
    const amount = Number(event.data_decoded.amount) / 10 ** DECIMAL[reserve]

    // const price = (await getPriceBySymbol(coin[reserve], ctx.timestamp))!
    // const usd_amount = amount * price

    //only checks sui reserve
    if (amount >= 5 && reserve == 0) {
        ctx.eventLogger.emit("Deposit", {
            distinctId: sender,
            sender,
            amount,
            // usd_amount,
            coin: coin[reserve],
            reserve,
            project: "navi"
        })
    }
}

lending.bind()
    .onEventDepositEvent(DepositHandler)