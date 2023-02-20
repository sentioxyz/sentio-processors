import {aptos_account, coin} from "@sentio/sdk/aptos/builtin/0x1";

import {DEFAULT_MAINNET_LIST, RawCoinInfo} from "@manahippo/coin-list";
import {scaleDown} from "@sentio-processor/common/aptos";

const coinInfoMap = new Map<string, RawCoinInfo>()

for (const x of DEFAULT_MAINNET_LIST) {
    coinInfoMap.set(x.token_type.type, x)
}

const APT_DECIMAL = 8

const WATCHES = new Map<string, string>([
        ["0x779c7c22193a9510f564e92747e1815f386d73877ed9f1720a03b5632ca1f460", "ftx"],
        ["0xae1a6f3d3daccaf77b55044cea133379934bba04a11b9d0bbd643eae5e6e9c70", "binance"],
        ["0xb0446c653452eae6d11467e7f4fcfe2175227ca22b2c7b3a802b9a64ddd250ee", "trading"],
        ["0xa881b11f0182881eb249f5185db7487b4f41b113efba42714652463c1567eaf7", "hot_wallet"],
        ["0x3bc06300a1b02496ebe8cc43751e5af7f61fdd444aece3c20ece31be98650b1e", "tracking_1_0xbc"],
        ["0xb0446c653452eae6d11467e7f4fcfe2175227ca22b2c7b3a802b9a64ddd250ee", "0xb0446c653452eae6d11467e7f4fcfe2175227ca22b2c7b3a802b9a64ddd250ee"],
        ["0x8781b5d5865f0f46d407a413a6a29d2a60a74bb1e629f14e170a68dde2a73094", "0x8781b5d5865f0f46d407a413a6a29d2a60a74bb1e629f14e170a68dde2a73094"],
        ["0x8285b0be3628e9ddd1161b0a93ebae074a21d5656d4fd4f5ba44e53dbcfbe39e", "0x8285b0be3628e9ddd1161b0a93ebae074a21d5656d4fd4f5ba44e53dbcfbe39e"],
        ["0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5", "0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5"],
        ["0x85d6e0395996d2d8ab1414470264b40d011ba0bbce5211ab33aed1ebb42e399d", "0x85d6e0395996d2d8ab1414470264b40d011ba0bbce5211ab33aed1ebb42e399d"],
        ["0x800e0609e333fa16fc627ff69d7b991b3f610232f1d16e7cab17eca6ccf02b4f", "0x800e0609e333fa16fc627ff69d7b991b3f610232f1d16e7cab17eca6ccf02b4f"],
        ["0xd7257c62806cea85fc8eaf947377b672fe062b81e6c0b19b6d8a3f408e59cf8c", "0xd7257c62806cea85fc8eaf947377b672fe062b81e6c0b19b6d8a3f408e59cf8c"],
        ["0xf920ce46ae9befa1639ef751053ce5f3de5e526df6d598ef384880faaf6eac27", "0xf920ce46ae9befa1639ef751053ce5f3de5e526df6d598ef384880faaf6eac27"],
        ["0xe0695b919d967f85edba070d3aa8f8ac0cc69fd0dfed18a340223846ba18af90", "0xe0695b919d967f85edba070d3aa8f8ac0cc69fd0dfed18a340223846ba18af90"],
        ["0x33a5ac76e9e7b91cee039e8758e60e3ba6306eb2dfd86828ae1c1b72730a0283", "0x33a5ac76e9e7b91cee039e8758e60e3ba6306eb2dfd86828ae1c1b72730a0283"],
        ["0x5b635682c771d8333fd3d8a6e9f654ff601969dff0773776087c4f162f37ca49", "0x5b635682c771d8333fd3d8a6e9f654ff601969dff0773776087c4f162f37ca49"],
        ["0x5bc59d86609df79963822e53ec65bd0e44a013db6976efc78484612d4d5ba37b", "0x5bc59d86609df79963822e53ec65bd0e44a013db6976efc78484612d4d5ba37b"],
        ["0x3f6184bc6c256e15c4ea5a88a2a4c373a621a2a9486bcbeacdc5b06809e5ecb9", "0x3f6184bc6c256e15c4ea5a88a2a4c373a621a2a9486bcbeacdc5b06809e5ecb9"],
        ["0xbca14e14911bebe2869928854209d033edb144b9ca1e48ab265914821c67c7d5", "0xbca14e14911bebe2869928854209d033edb144b9ca1e48ab265914821c67c7d5"],
        ["0x7eb53ac5b9d0c6dd0b29da998a9c1d1e6f8592c677d8e601c1bbde4fcd0c1480", "0x7eb53ac5b9d0c6dd0b29da998a9c1d1e6f8592c677d8e601c1bbde4fcd0c1480"],
        ["0x7861d368d0c18705ff00a152decca088b7896df3384145f708a22c9cd019049d", "0x7861d368d0c18705ff00a152decca088b7896df3384145f708a22c9cd019049d"],
        ["0xfd2594ac71d95d1e86df9921d03ad2a409b871ee7f866560c21ff17945fd2fca", "0xfd2594ac71d95d1e86df9921d03ad2a409b871ee7f866560c21ff17945fd2fca"]
    ]
)

coin.bind()
    .onEntryTransfer((call, ctx) => {
        if (call.type_arguments[0] == "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin") {
            const from = ctx.transaction.sender
            const to = call.arguments_decoded[0]
            const fromLabel = WATCHES.get(from)
            const toLabel = WATCHES.get(to)
            const amount = scaleDown(call.arguments_decoded[1], APT_DECIMAL)

            ctx.eventLogger.emit("transfer_from", {
                distinctId: from,
                "amount": amount.toNumber(),
                "symbol": "tAPT",
                "account": from,
                "label": fromLabel,
                "to": to,
                "to_label": toLabel,
            })
            ctx.eventLogger.emit("transfer_to", {
                distinctId: to,
                "amount": amount.toNumber(),
                "symbol": "tAPT",
                "account": to,
                "label": toLabel,
                "from": from,
                "from_label": fromLabel,
            })
        }
    })
// .onEventDepositEvent((evt, ctx) => {
//   if (evt.guid.account_address === FTX_ADDRESS) {{
//     ctx.meter.Counter("in_tx_amount_cume").add(scaleDown(evt.data_decoded.amount, APT_DECIMAL), { from: ctx.transaction.sender })
//   }}
// })
// .onEventWithdrawEvent((evt, ctx) => {
//   if (evt.guid.account_address === FTX_ADDRESS) {{
//     ctx.meter.Counter("out_tx_amount_cume").add(scaleDown(evt.data_decoded.amount, APT_DECIMAL), { from: ctx.transaction.sender })
//   }}
// })
//

aptos_account.bind()
    .onEntryTransfer((call, ctx) => {
        const from = ctx.transaction.sender
        const to = call.arguments_decoded[0]
        const amount = scaleDown(call.arguments_decoded[1], APT_DECIMAL)
        const fromLabel = WATCHES.get(from)
        const toLabel = WATCHES.get(to)

        ctx.eventLogger.emit("transfer_from", {
            distinctId: from,
            "amount": amount.toNumber(),
            "symbol": "APT",
            "account": from,
            "label": fromLabel,
            "to": to,
            "to_label": toLabel,
        })
        ctx.eventLogger.emit("transfer_to", {
            distinctId: to,
            "amount": amount.toNumber(),
            "symbol": "APT",
            "account": to,
            "label": toLabel,
            "from": from,
            "from_label": fromLabel,
        })
    })