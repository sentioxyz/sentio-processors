import { typus_dov_single } from "./types/sui/typus.js";
import { SuiContext } from "@sentio/sdk/sui";
import { normalizeSuiAddress } from "@mysten/sui.js";

function getCoinSymbol(name: string): string {
    let typeArgs = name.split("::");
    if (normalizeSuiAddress(typeArgs[0]) == "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf")
        return "usdc"
    else
        return typeArgs[2].toLowerCase()
}

const depositEventHandler = async (event: typus_dov_single.DepositInstance, ctx: SuiContext) => {
    const { amount, index, signer } = event.data_decoded
    const regex = /Deposit<([^>]+)>/
    const type = event.type.match(regex)[1]
    const coin_symbol = getCoinSymbol(type)
    let decimal = 0
    if (coin_symbol == "usdc") decimal = 8
    if (coin_symbol == "sui" || coin_symbol == "cetus") decimal = 9
    // console.log("entering", amount, type, coin_symbol, decimal, index, signer)
    if ((coin_symbol == "sui" || coin_symbol == "usdc" && Number(amount) / 10 ** decimal > 5) ||
        (coin_symbol == "cetus" && Number(amount) / 10 ** decimal > 10)) {
        ctx.eventLogger.emit("Deposit", {
            distinctId: signer,
            amount: Number(amount) / 10 ** decimal,
            index,
            type,
            coin_symbol,
            project: "typus"
        })
    }
}

typus_dov_single.bind({
})
    .onEventDeposit(depositEventHandler)



