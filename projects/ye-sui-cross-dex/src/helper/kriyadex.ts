// @ts-nocheck
import { SuiObjectProcessor, SuiContext, SuiObjectContext } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import { SuiNetwork } from "@sentio/sdk/sui"

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
    const regex_b = /0x[^\s>]+>/g;
    const matches_a = type.match(regex_a)
    const matches_b = type.match(regex_b)
    if (matches_a) {
        coin_a_address = matches_a[0].slice(1, -1)
    }
    if (matches_b) {
        coin_b_address = matches_b[0].slice(0, -1)
    }
    return [coin_a_address, coin_b_address]
}

interface poolInfo {
    symbol_a: string,
    symbol_b: string,
    decimal_a: number,
    decimal_b: number,
    pairName: string,
    pairFullName: string,
    type: string
}


let poolInfoMap = new Map<string, Promise<poolInfo>>()
let IDOPoolInfoMap = new Map<string, Promise<poolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]
    try {
        const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
        symbol = metadata.symbol
        decimal = metadata.decimals
        name = metadata.name + " (" + coinAddress.slice(2, 4) + ")"
        console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
    }
    catch (e) {
        console.log(`${e.message} get coin metadata error ${coinAddress}`)
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
        // console.log("set coinInfoMap for " + coinAddress)
        let i = 0
        let msg = `set coinInfoMap for ${(await coinInfo).name}`
        for (const key of coinInfoMap.keys()) {
            const coinInfo = await coinInfoMap.get(key)
            msg += `\n${i}:${coinInfo?.name},${coinInfo?.decimal} `
            i++
        }
        console.log(msg)
    }
    return coinInfo
}

export async function buildPoolInfo(ctx: SuiContext | SuiObjectContext, pool: string): Promise<poolInfo> {
    let [symbol_a, symbol_b, decimal_a, decimal_b, pairName, type, fee_label, pairFullName] = ["", "", 0, 0, "", "", "", "NaN", ""]
    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        type = obj.data.type
        // console.log(`building pool ${pool} type ${type} lp ${obj.data.content.fields.lp_fee_percentage} p ${obj.data.content.fields.protocol_fee_percentage} or ${obj.data.content.fields.lp_fee_percentage || obj.data.content.fields.protocol_fee_percentage} json ${JSON.stringify(obj)}`)
        if (obj.data.content.fields.lp_fee_percent || obj.data.content.fields.protocol_fee_percent) {
            fee_label = ((Number(obj.data.content.fields.lp_fee_percent) + Number(obj.data.content.fields.protocol_fee_percent)) / 10000).toFixed(2) + "%"
        }
        else {
            console.log(`no fee label ${pool}`)
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
        console.log(`build pool ${pairName}`)
        pairFullName = coinInfo_a.name + "-" + coinInfo_b.name + " " + fee_label

    } catch (e) {
        console.log(`${e.message} get pool object error ${pool}`)
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
        // console.log("set poolInfoMap for " + pool)
        let i = 0
        let msg = `set poolInfoMap for ${(await infoPromise).pairName} ${pool}`
        for (const key of poolInfoMap.keys()) {
            const poolInfo = await poolInfoMap.get(key)
            msg += `\n${i}:${poolInfo?.pairName} `
            i++
        }
        console.log(msg)
    }
    return infoPromise
}





export async function getPoolPrice(ctx: SuiContext | SuiObjectContext, pool: string) {
    const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
    const poolInfo = await getOrCreatePool(ctx, pool)
    const reserve_x = Number(obj.data.content.fields.token_x) / 10 ** poolInfo.decimal_a
    const reserve_y = Number(obj.data.content.fields.token_y) / 10 ** poolInfo.decimal_b
    if (!reserve_y) {
        console.log(`get pool price error at ${ctx.timestamp} ${pool}`)
        return 1
    }
    const pairName = poolInfo.pairName
    const pairFullName = poolInfo.pairFullName
    const coin_b2a_price = reserve_x / reserve_y
    const coin_a2b_price = 1 / coin_b2a_price
    ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName, pairFullName, project: "kriya" })
    ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName, pairFullName, project: "kriya" })
    ctx.meter.Gauge("liquidity").record(coin_b2a_price, { pairName, pairFullName, project: "kriya" })
    return coin_a2b_price
}





export async function calculateValue_USD(ctx: SuiContext | SuiObjectContext, pool: string, amount_a: number, amount_b: number, date: Date) {
    const poolInfo = await getOrCreatePool(ctx, pool)
    const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
    const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
    const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)

    const coin_a2b_price = await getPoolPrice(ctx, pool)

    let [value_a, value_b] = [0, 0]
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

    return value_a + value_b
}


export async function calculateSwapVol_USD(type: string, amount_in: number, amount_out: number, date: Date) {
    const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
    const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
    const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)

    let vol = 0
    if (price_a) {
        vol = amount_in * price_a
    }
    else if (price_b) {
        vol = amount_out * price_b
    }
    else {
        console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${type}`)
    }

    return vol
}
