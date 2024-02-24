import { SuiContext, SuiObjectContext } from "@sentio/sdk/sui"
import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils"
import { SuiNetwork } from "@sentio/sdk/sui"
import * as constant from "./constant.js"

//get full coin address with suffix
export function getCoinFullAddress(type: string) {
    let coin_a_address = ""
    let coin_b_address = ""
    if (type.includes(constant.IPX_POOL_TYPE)) {
        const regex = /(?:<|>|,|\s)([^<>,\s]+)/g
        const matches = type.match(regex)
        if (matches && matches.length == 3)
            return [matches[1].slice(1), matches[2].slice(1)]
    }
    else if (type.includes(constant.TURBOS_POOL_TYPE)) {
        console.log("turbos type", type)
        const regex = /(?:<|>|,|\s)([^<>,\s]+)/g
        const matches = type.match(regex)
        //@ts-ignore
        console.log("matches", matches[0], matches[1])

        if (matches && matches.length == 3)
            return [matches[0].slice(1), matches[1].slice(1)]
    }
    else {
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
    return ["", ""]
}

export interface poolInfo {
    pool: string,
    symbol_a: string,
    symbol_b: string,
    decimal_a: number,
    decimal_b: number,
    pairName: string,
    fee: number,
    type_a: string,
    type_b: string
}

export interface multiAssetPoolInfo {
    pool: string,
    fee: number,
    symbols: string[],
    decimals: number[],
    types: string[],
    pairName: string
}


let poolInfoMap = new Map<string, Promise<poolInfo>>()
let multiAssetPoolInfoMap = new Map<string, Promise<multiAssetPoolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: SuiContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]
    try {
        const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
        //@ts-ignore
        symbol = metadata.symbol
        //@ts-ignore
        decimal = metadata.decimals
        //@ts-ignore
        name = metadata.name
        console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
    }
    catch (e) {
        console.log(`${e.message} get coin metadata error ${coinAddress} ${ctx.transaction.digest}`)
    }

    return {
        symbol,
        name,
        decimal
    }
}

export const getOrCreateCoin = async function (ctx: SuiContext, coinAddress: string): Promise<token.TokenInfo> {
    console.log("coinAddress", coinAddress)
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

export async function buildPoolInfo(ctx: SuiContext, pool: string): Promise<poolInfo> {
    let [symbol_a, symbol_b, decimal_a, decimal_b, pairName, fee, type, type_a, type_b] = ["", "", 0, 0, "", 0, "", "", ""]

    try {
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        //@ts-ignore
        type = obj.data.type

        if (type) {
            [type_a, type_b] = getCoinFullAddress(type)
        }

        const coinInfo_a = await getOrCreateCoin(ctx, type_a)
        const coinInfo_b = await getOrCreateCoin(ctx, type_b)
        symbol_a = coinInfo_a.symbol
        symbol_b = coinInfo_b.symbol
        decimal_a = coinInfo_a.decimal
        decimal_b = coinInfo_b.decimal
        //handle fee
        if (type.includes(constant.CETUS_POOL_TYPE)) {
            //@ts-ignore
            fee = Number(obj.data?.content.fields.fee_rate) / 10 ** 6
        }
        if (type.includes(constant.KRIYA_POOL_TYPE)) {
            //@ts-ignore
            fee = obj.data?.content.fields.is_stable ? 0.0001 : 0.002
        }
        if (type.includes(constant.TURBOS_POOL_TYPE)) {
            //@ts-ignore
            fee = Number(obj.data?.content.fields.feee) / 10 ** 6
        }
        if (type.includes(constant.IPX_POOL_TYPE)) {
            //@ts-ignore
            fee = obj.data?.content.fields.is_stable ? 0.00025 : 0.003
        }
        if (type.includes(constant.FLOWX_POOL_TYPE)) {
            const stableCoins = ["0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN", "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN"]
            fee = (stableCoins.includes(type_a) && stableCoins.includes(type_b)) ? 0.0001 : 0.003
        }
        if (type.includes(constant.DEEPBOOK_POOL_TYPE)) {
            fee = 0.0025
        }
        if (type.includes(constant.AFTERMATH_POOL_TYPE)) {
            //@ts-ignore
            fee = Number(obj.data?.content.fields.fees_swap_in[0]) / 10 ** (decimal_a + 6)
        }

        pairName = symbol_a + "-" + symbol_b + `-${fee * 100}%`

        console.log(`build pool ${pairName}`)
    } catch (e) {
        console.log(`${e.message} get pool object error ${pool} `)
    }
    const poolInfo: poolInfo = {
        pool,
        symbol_a,
        symbol_b,
        decimal_a,
        decimal_b,
        pairName,
        fee,
        type_a,
        type_b
    }
    return Promise.resolve(poolInfo)
}

export const getOrCreatePool = async function (ctx: SuiContext, pool: string): Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(pool)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx, pool)
        poolInfoMap.set(pool, infoPromise)
        // console.log("set poolInfoMap for " + pool)
        let i = 0
        let msg = `set poolInfoMap for ${(await infoPromise).pairName}`
        for (const key of poolInfoMap.keys()) {
            const poolInfo = await poolInfoMap.get(key)
            msg += `\n${i}:${poolInfo?.pairName} `
            i++
        }
        console.log(msg)
    }
    return infoPromise
}

export async function buildMultiAssetPoolInfo(ctx: SuiContext, pool: string): Promise<multiAssetPoolInfo> {
    let symbols: string[] = []
    let decimals: number[] = []
    let types: string[] = []
    let pairName = ""
    let fee = 0

    try {
        console.log("get pool", pool)
        const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
        console.log("obj data ", JSON.stringify(obj.data))

        //@ts-ignore
        for (const type of obj.data?.content.fields.type_names) {
            const coinType = "0x" + type
            console.log("coinType 1 ", coinType)
            const coinInfo = await getOrCreateCoin(ctx, coinType)
            symbols.push(coinInfo.symbol)
            decimals.push(coinInfo.decimal)
            pairName += coinInfo.symbol + "-"
            types.push(coinType)
        }

        //@ts-ignore
        if (obj.data.type.includes(constant.AFTERMATH_POOL_TYPE)) {
            //@ts-ignore
            fee = Number(obj.data?.content.fields.fees_swap_in[0]) / 10 ** 17
        }

        pairName += `${fee * 100}%`


        console.log(`build pool ${pairName} types ${types}`)
    } catch (e) {
        console.log(`${e.message} get multi asset pool object error ${pool}`)
    }

    const multiAssetPoolInfo: multiAssetPoolInfo = {
        pool,
        fee,
        symbols,
        decimals,
        types,
        pairName
    }
    return Promise.resolve(multiAssetPoolInfo)
}

export const getOrCreateMultiAssetPool = async function (ctx: SuiContext, pool: string): Promise<multiAssetPoolInfo> {
    let infoPromise = multiAssetPoolInfoMap.get(pool)
    if (!infoPromise) {
        infoPromise = buildMultiAssetPoolInfo(ctx, pool)
        multiAssetPoolInfoMap.set(pool, infoPromise)
        // console.log("set poolInfoMap for " + pool)
        let i = 0
        let msg = `set multiAssetPoolInfoMap for ${(await infoPromise).pairName}`
        for (const key of multiAssetPoolInfoMap.keys()) {
            const multiAssetPoolInfo = await multiAssetPoolInfoMap.get(key)
            msg += `\n${i}:${multiAssetPoolInfo?.pairName} `
            i++
        }
        console.log(msg)
    }
    return infoPromise
}


export async function getPoolPrice(ctx: SuiContext, pool: string) {
    const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
    //@ts-ignore
    const current_sqrt_price = Number(obj.data.content.fields.current_sqrt_price)
    if (!current_sqrt_price) { console.log(`get pool price error at ${ctx}`) }
    const poolInfo = await getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (poolInfo.decimal_b - poolInfo.decimal_a)
    const coin_a2b_price = 1 / coin_b2a_price
    ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
    ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName })
    return coin_a2b_price
}


export async function calculateSwapVol_USD(ctx: SuiContext, poolInfo: poolInfo, amount_in: number, amount_out: number, atob: Boolean) {
    // const price_a = await getPriceBySymbol(symbol_a, date)
    // const price_b = await getPriceBySymbol(symbol_b, date)
    let price_a = 0
    let price_b = 0
    try {
        price_a = (await getPriceByType(SuiNetwork.MAIN_NET, poolInfo.type_a, ctx.timestamp))!
        price_b = (await getPriceByType(SuiNetwork.MAIN_NET, poolInfo.type_b, ctx.timestamp))!
    }
    catch (e) {
        console.log(`${e.message} getPrice error ${poolInfo.type_a},${poolInfo.type_b},${ctx.transaction.digest},${poolInfo.pool}`)
    }
    console.log("getPriceByType price of ", poolInfo.symbol_a, poolInfo.symbol_b, price_a, price_b, poolInfo.pool)
    let vol = 0
    if (price_a) {
        vol = (atob ? amount_in : amount_out) * price_a
        // console.log(`price a ${coin_a_full_address} ${coin_b_full_address} ${date}`)
    }
    else if (price_b) {
        vol = (atob ? amount_out : amount_in) * price_b
        // console.log(`price b ${coin_a_full_address} ${coin_b_full_address} ${date}`)
    }
    else {
        console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${ctx.transaction.digest} ${poolInfo.pool} ${ctx.timestamp}`)
    }
    if (!price_a) {
        ctx.eventLogger.emit("PriceNotSupported", {
            type: poolInfo.type_a,
            symbol: poolInfo.symbol_a,
            pool: poolInfo.pool,
            pairName: poolInfo.pairName
        })
    }
    if (!price_b) {
        ctx.eventLogger.emit("PriceNotSupported", {
            type: poolInfo.type_a,
            symbol: poolInfo.symbol_b,
            pool: poolInfo.pool,
            pairName: poolInfo.pairName
        })
    }

    return vol
    // return 1
}


export async function calculateMultiAssetSwapVol_USD(ctx: SuiContext, multiAssetPoolInfo: multiAssetPoolInfo, types_in: string[], types_out: string[], symbols_in: string[], symbols_out: string[], amounts_in: number[], amounts_out: number[]) {
    let vol = 0
    for (let i = 0; i < types_in.length; i++) {
        let price = 0
        try {
            price = (await getPriceByType(SuiNetwork.MAIN_NET, types_in[i], ctx.timestamp))!
        }
        catch (e) {
            console.log(`${e.message} price not in sui coinlist, calculateMultiAsset ${ctx.transaction.digest} ${multiAssetPoolInfo.pool}`)
        }
        if (price) {
            vol += price * amounts_in[i]
        }
        else {
            ctx.eventLogger.emit("PriceNotSupported", {
                type: types_in[i],
                symbol: symbols_in[i],
                pool: multiAssetPoolInfo.pool,
                pairName: multiAssetPoolInfo.pairName
            })
        }
    }
    return vol
    // return 1
}


export async function calculateFee_USD(ctx: SuiContext, pool: string, amount: number, atob: Boolean, date: Date) {
    let vol = 0

    try {
        const poolInfo = await getOrCreatePool(ctx, pool)
        const price_a = await getPriceBySymbol(poolInfo.symbol_a, date)
        const price_b = await getPriceBySymbol(poolInfo.symbol_b, date)
        const coin_a2b_price = await getPoolPrice(ctx, pool)

        if (!price_a && !price_b) {
            console.log(`price not in sui coinlist, calculate fee failed at ${JSON.stringify(poolInfo)} at ${pool}`)
            return 0
        }

        if (atob) {
            if (price_a) vol = amount * price_a
            else if (price_b) vol = amount * coin_a2b_price * price_b
        }
        else {
            if (price_b) vol = amount * price_b
            else if (price_a) vol = amount / coin_a2b_price * price_a
        }
    }
    catch (e) {
        console.log(`calculate fee error ${e.message} at at ${pool} ${amount}`)
    }

    return vol
}