import { SuiObjectProcessor, SuiContext, SuiObjectContext } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from '../constant-turbos.js'
import { SuiNetwork } from "@sentio/sdk/sui"

const wormholeTokens = new Set([
    "0xa198f3be41cda8c07b3bf3fee02263526e535d682499806979a111e88a5a8d0f",
    "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881",
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf",
    "0xe32d3ebafa42e6011b87ef1087bbc6053b499bf6f095807b9013aff5a6ecd7bb",
    "0x909cba62ce96d54de25bec9502de5ca7b4f28901747bbf96b76c2e63ec5f1cba",
    "0xcf72ec52c0f8ddead746252481fb44ff6e8485a39b803825bde6b00d77cdb0bb",
    "0xb231fcda8bbddb31f2ef02e6161444aec64a514e2c89279584ac9806ce9cf037",
    "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c",
    "0x1e8b532cca6569cab9f9b9ebc73f8c13885012ade714729aa3b450e0339ac766",
    "0xb848cce11ef3a8f62eccea6eb5b35a12c4c2b1ee1af7755d02d7bd6218e8226f",
    "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881",
    "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5",
    "0x6081300950a4f1e2081580e919c210436a1bed49080502834950d31ee55a2396",
    "0x66f87084e49c38f76502d17f87d17f943f183bb94117561eb573e075fdc5ff75",
    "0xdbe380b13a6d0f5cdedd58de8f04625263f113b3f9db32b3e1983f49e2841676",
    "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8"
])

export function getBridgeInfo(address: string) {
    if (wormholeTokens.has(address)) {
        return "wormhole"
    } else {
        return "native"
    }
}

//get coin address without suffix
export function getCoinObjectAddress(type: string) {
    let coin_a_address = ""
    let coin_b_address = ""
    const regex = /0x[a-fA-F0-9]+:/g
    const matches = type.match(regex)
    if (matches && matches.length >= 2) {
        coin_a_address = matches[1].slice(0, -1)
        coin_b_address = matches[2].slice(0, -1)
    }
    return [coin_a_address, coin_b_address]
}

//get full coin address with suffix
export function getCoinFullAddress(type: string) {
    let coin_a_address = ""
    let coin_b_address = ""
    const regex_a = /<[^,]+,/g;
    const regex_b = /, [^\s>]+,/g;
    const matches_a = type.match(regex_a)
    const matches_b = type.match(regex_b)
    if (matches_a) {
        coin_a_address = matches_a[0].slice(1, -1)
    }
    if (matches_b) {
        coin_b_address = matches_b[0].slice(2, -1)
    }
    return [coin_a_address, coin_b_address]
}

interface poolInfo {
    symbol_a: string,
    symbol_b: string,
    decimal_a: number,
    decimal_b: number,
    pairName: string,//symbol_a + symbol_b + fee
    pairFullName: string, //name_a + name_b + fee
    type: string
}


let poolInfoMap = new Map<string, Promise<poolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, decimal, name] = ["unk", 100, "unk"]
    try {
        const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
        // @ts-ignore
        symbol = metadata.symbol
        // @ts-ignore
        decimal = metadata.decimals
        // @ts-ignore
        name = metadata.name
        console.log(`build coin metadata ${symbol} ${decimal} ${name}`)

    }
    catch (e) {
        console.log(`Build coin error ${e.message} at ${JSON.stringify(ctx)}`)
    }
    return {
        symbol,
        name,
        decimal
    }
}

export const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
    let coinInfo = coinInfoMap.get(coinAddress)
    if (!coinInfo) {
        coinInfo = buildCoinInfo(ctx, coinAddress)
        coinInfoMap.set(coinAddress, coinInfo)
        console.log("set coinInfoMap for " + coinAddress)
    }
    return await coinInfo
}

export async function buildPoolInfo(ctx: SuiContext | SuiObjectContext, pool: string): Promise<poolInfo> {
    //pool not in list
    // if (!constant.POOLS_INFO_MAINNET.includes(pool)) {
    //     console.log(`Pool not in array ${pool}`)
    // }

    let [symbol_a, symbol_b, decimal_a, decimal_b, pairName, pairFullName, type, fee_label] = ["", "", 0, 0, "", "", "", "", "NaN"]
    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        // @ts-ignore
        type = obj.data.type
        // @ts-ignore
        if (obj.data.content.fields.fee) {
            // @ts-ignore
            fee_label = (Number(obj.data.content.fields.fee) / 10000).toFixed(2) + "%"
        }
        let [coin_a_full_address, coin_b_full_address] = ["", ""]
        if (type) {
            [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
        }
        const coinInfo_a = await getOrCreateCoin(ctx, coin_a_full_address)
        const coinInfo_b = await getOrCreateCoin(ctx, coin_b_full_address)
        symbol_a = coinInfo_a.symbol
        symbol_b = coinInfo_b.symbol
        decimal_a = coinInfo_a.decimal
        decimal_b = coinInfo_b.decimal
        pairName = symbol_a + "-" + symbol_b + " " + fee_label
        pairFullName = coinInfo_a.name + "-" + coinInfo_b.name + " " + fee_label
    }
    catch (e) {
        console.log(`Build pool error ${e.message} at ${JSON.stringify(ctx)}`)
    }

    return {
        symbol_a,
        symbol_b,
        decimal_a,
        decimal_b,
        pairName,
        pairFullName,
        type
    }
}

export const getOrCreatePool = async function (ctx: SuiContext | SuiObjectContext, pool: string): Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(pool)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx, pool)
        poolInfoMap.set(pool, infoPromise)
        console.log("set poolInfoMap for " + pool)
    }
    return await infoPromise
}

export async function getPoolPrice(ctx: SuiContext | SuiObjectContext, pool: string) {
    let coin_a2b_price = 0
    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        //@ts-ignore
        const sqrt_price = Number(obj.data.content.fields.sqrt_price)
        if (!sqrt_price) { console.log(`get pool price error at ${ctx}`) }
        const poolInfo = await getOrCreatePool(ctx, pool)
        const pairName = poolInfo.pairName
        const pairFullName = poolInfo.pairFullName
        const coin_b2a_price = 1 / (Number(sqrt_price) ** 2) * (2 ** 128) * 10 ** (poolInfo.decimal_b - poolInfo.decimal_a)
        coin_a2b_price = 1 / coin_b2a_price
        ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName, pairFullName })
        ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName, pairFullName })
    }
    catch (e) {
        console.log(`get pool price error ${e.message} at ${JSON.stringify(ctx)}`)
    }
    return coin_a2b_price
}


export async function calculateValue_USD(ctx: SuiContext | SuiObjectContext, pool: string, amount_a: number, amount_b: number, date: Date) {
    let [value_a, value_b] = [0, 0]
    try {
        const poolInfo = await getOrCreatePool(ctx, pool)
        const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
        const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
        const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)
        console.log(`price_a ${price_a}, price_b ${price_b}`)
        const coin_a2b_price = await getPoolPrice(ctx, pool)

        if (price_a) {
            value_a = amount_a * price_a
            //handle the case of low liquidity
            if (price_b) {
                value_b = amount_b * price_b
            }
            else {
                value_b = amount_b / coin_a2b_price * price_a
            }
        }
        else if (price_b) {
            value_a = amount_a * coin_a2b_price * price_b
            value_b = amount_b * price_b
        }
        else {
            console.log(`price not in sui coinlist, calculate value failed at coin_a: ${coin_a_full_address},coin_b: ${coin_b_full_address} at ${JSON.stringify(ctx)}`)
        }
    }
    catch (e) {
        console.log(` calculate value error ${e.message} at ${JSON.stringify(ctx)}`)
    }
    return [value_a, value_b]

}


export async function calculateSwapVol_USD(type: string, amount_a: number, amount_b: number, atob: Boolean, date: Date) {
    let vol: number = 0
    let price_a
    let price_b

    try {
        const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
        price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
        price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)

        if (price_a) {
            vol = amount_a * price_a
        }
        else if (price_b) {
            vol = amount_b * price_b
            // use exchange rate to try to fill price_a
            if (amount_a != 0) {
                price_a = amount_b / amount_a * price_b
            }
        }
        else {
            console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${type}`)
        }

    }
    catch (e) {
        console.log(` calculate swap value error ${e.message} at ${type}`)
    }
    return [vol, price_a, price_b]

}

