import { SuiObjectProcessor, SuiContext, SuiObjectsContext } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from '../constant.js'
import { SuiChainId } from "@sentio/sdk"

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
    pairName: string,
    type: string
}


let poolInfoMap = new Map<string, Promise<poolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: SuiContext | SuiObjectsContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, decimal, name] = ["unk", 100, "unk"]
    try {
        const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
        symbol = metadata.symbol
        decimal = metadata.decimals
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

export const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectsContext, coinAddress: string): Promise<token.TokenInfo> {
    let coinInfo = coinInfoMap.get(coinAddress)
    if (!coinInfo) {
        coinInfo = buildCoinInfo(ctx, coinAddress)
        coinInfoMap.set(coinAddress, coinInfo)
        console.log("set coinInfoMap for " + coinAddress)
    }
    return await coinInfo
}

export async function buildPoolInfo(ctx: SuiContext | SuiObjectsContext, pool: string): Promise<poolInfo> {
    //pool not in list
    if (!constant.POOLS_INFO_MAINNET.includes(pool)) {
        console.log(`Pool not in array ${pool}`)
    }

    let [symbol_a, symbol_b, decimal_a, decimal_b, pairName, type, fee_label] = ["", "", 0, 0, "", "", "", "NaN"]
    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        type = obj.data.type
        if (obj.data.content.fields.fee) {
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
    }
    catch (e) {
        console.log(` Build pool error ${e.message} at ${JSON.stringify(ctx)}`)
    }

    return {
        symbol_a,
        symbol_b,
        decimal_a,
        decimal_b,
        pairName,
        type
    }
}

export const getOrCreatePool = async function (ctx: SuiContext | SuiObjectsContext, pool: string): Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(pool)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx, pool)
        poolInfoMap.set(ctx.address, infoPromise)
        console.log("set poolInfoMap for " + pool)
    }
    return await infoPromise
}

export async function getPoolPrice(ctx: SuiContext | SuiObjectsContext, pool: string) {
    let coin_a2b_price = 0
    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        const sqrt_price = Number(obj.data.content.fields.sqrt_price)
        if (!sqrt_price) { console.log(`get pool price error at ${ctx}`) }
        const poolInfo = await getOrCreatePool(ctx, pool)
        const pairName = poolInfo.pairName
        const coin_b2a_price = 1 / (Number(sqrt_price) ** 2) * (2 ** 128) * 10 ** (poolInfo.decimal_b - poolInfo.decimal_a)
        coin_a2b_price = 1 / coin_b2a_price
        ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
        ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName })
    }
    catch (e) {
        console.log(` get pool price error ${e.message} at ${JSON.stringify(ctx)}`)
    }
    return coin_a2b_price
}


export async function calculateValue_USD(ctx: SuiContext | SuiObjectsContext, pool: string, amount_a: number, amount_b: number, date: Date) {
    let [value_a, value_b] = [0, 0]
    try {
        const poolInfo = await getOrCreatePool(ctx, pool)
        const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
        const price_a = await getPriceByType(SuiChainId.SUI_MAINNET, coin_a_full_address, date)
        const price_b = await getPriceByType(SuiChainId.SUI_MAINNET, coin_b_full_address, date)
        console.log(`price_a ${price_a}, price_b ${price_b}`)
        const coin_a2b_price = await getPoolPrice(ctx, pool)

        if (price_a) {
            value_a = amount_a * price_a
            value_b = amount_b / coin_a2b_price * price_a
        }
        else if (price_b) {
            value_a = amount_a * coin_a2b_price * price_b
            value_b = amount_b * price_b
        }
        else {
            console.log(`price not in sui coinlist, calculate value failed at ${ctx}`)
        }
    }
    catch (e) {
        console.log(` calculate value error ${e.message} at ${JSON.stringify(ctx)}`)
    }
    return value_a + value_b

}


export async function calculateSwapVol_USD(type: string, amount_a: number, amount_b: number, atob: Boolean, date: Date) {
    let vol = 0

    try {
        const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
        const price_a = await getPriceByType(SuiChainId.SUI_MAINNET, coin_a_full_address, date)
        const price_b = await getPriceByType(SuiChainId.SUI_MAINNET, coin_b_full_address, date)

        if (price_a) {
            vol = amount_a * price_a
        }
        else if (price_b) {
            vol = amount_b * price_b
        }
        else {
            console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${type}`)
        }
    }
    catch (e) {
        console.log(` calculate swap value error ${e.message} at ${type}`)
    }
    return vol

}

