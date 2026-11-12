import { SuiContext, SuiObjectContext, SuiNetwork } from "@sentio/sdk/sui"
import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils"


//get full coin addresses [coin_a, coin_b] from a pool type string like
//`0x...::pool::Pool<A, B>` or `0x...::pool::Pool<A,B>` (gRPC omits the space).
//Splits the generic arguments on the top-level comma so nested generics are handled.
export function getCoinFullAddress(type: string) {
    const start = type.indexOf("<")
    const end = type.lastIndexOf(">")
    if (start < 0 || end <= start) {
        return ["", ""]
    }
    const inner = type.slice(start + 1, end)
    const args: string[] = []
    let depth = 0
    let last = 0
    for (let i = 0; i < inner.length; i++) {
        const c = inner[i]
        if (c == "<") depth++
        else if (c == ">") depth--
        else if (c == "," && depth == 0) {
            args.push(inner.slice(last, i).trim())
            last = i + 1
        }
    }
    args.push(inner.slice(last).trim())
    if (args.length < 2) {
        return ["", ""]
    }
    return [args[0], args[1]]
}

const Q64 = 2 ** 64

//convert a Q64.64 sqrt price to prices in both directions, adjusted by coin decimals.
//a2b = sqrt^2 / 2^128 * 10^(decimal_a - decimal_b), b2a = 2^128 / sqrt^2 * 10^(decimal_b - decimal_a)
export function sqrtPriceToPrices(sqrt_price: bigint | number | string, decimal_a: number, decimal_b: number) {
    const ratio = Number(sqrt_price) / Q64
    const ratio_sq = ratio * ratio
    if (!ratio_sq || !Number.isFinite(ratio_sq)) {
        return { a2b: 0, b2a: 0 }
    }
    const a2b = ratio_sq * 10 ** (decimal_a - decimal_b)
    const b2a = 10 ** (decimal_b - decimal_a) / ratio_sq
    return { a2b, b2a }
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

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]

    let retryCounter = 0;
    while (retryCounter++ <= 50) {
        try {
            const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
            if (metadata == null) {
                break
            }

            symbol = metadata.symbol
            decimal = metadata.decimals
            name = metadata.name
            console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
        } catch (e) {
            console.log(`${e.message} get coin metadata error ${coinAddress}, retry: ${retryCounter}`)
            await delay(10000)
            continue
        }
        break
    }

    return {
        symbol,
        name,
        decimal
    }
}

export const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
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

export async function buildPoolInfo(ctx: SuiContext | SuiObjectContext, pool: string): Promise<poolInfo> {
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
        //@ts-ignore
        fee = Number(obj.data?.content.fields.fee_rate) / 10 ** 6

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

export const getOrCreatePool = async function (ctx: SuiContext | SuiObjectContext, pool: string): Promise<poolInfo> {
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


export async function getA2bPrice(ctx: SuiContext, sqrt_price: bigint, poolInfo: poolInfo) {
    if (!sqrt_price || !poolInfo) {
        console.log(`get pool sqrt price error ${sqrt_price} ${poolInfo} at ${ctx.timestamp}`)
        return 0
    }

    return sqrtPriceToPrices(sqrt_price, poolInfo.decimal_a, poolInfo.decimal_b).a2b
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

export async function calculateValueUSD(ctx: SuiContext | SuiObjectContext, poolInfo: poolInfo, amount_a: number, amount_b: number) {
    const value_a = await calculateSingleTypeValueUSD(ctx, poolInfo.type_a, amount_a)
    const value_b = await calculateSingleTypeValueUSD(ctx, poolInfo.type_b, amount_b)
    return value_a + value_b
}


export async function calculateSingleTypeValueUSD(ctx: SuiContext | SuiObjectContext, coinType: string, amount: number) {
    let price = null
    try {
        price = (await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp))
        console.log("get single type price of ", coinType, price)
    }
    catch (e) {
        console.log(`${e.message} get single type price error ${coinType} `)
    }


    if (price) {
        return amount * price
    }
    else {
        console.log(`price not in sui coinlist, calculate vol failed for ${coinType} ${ctx.timestamp}`)
        ctx.eventLogger.emit("PriceNotSupported", {
            type: coinType
        })
    }
    return 0
}

export async function getFlowXPoolId(ctx: SuiContext, coin_a: string, coin_b: string) {
    const getDynamicFieldObjectXY = await ctx.client.getDynamicFieldObject({
        parentId: "0xd15e209f5a250d6055c264975fee57ec09bf9d6acdda3b5f866f76023d1563e6",
        name: {
            type: '0x1::string::String',
            value: `LP-${coin_a}-${coin_b}`,
        }
    })
    console.log("getDynamicFieldObjectXY", JSON.stringify(getDynamicFieldObjectXY))
    const getDynamicFieldObjectYX = await ctx.client.getDynamicFieldObject({
        parentId: "0xd15e209f5a250d6055c264975fee57ec09bf9d6acdda3b5f866f76023d1563e6",
        name: {
            type: '0x1::string::String',
            value: `LP-${coin_b}-${coin_a}`,
        }
    })

    const pool_id = getDynamicFieldObjectXY.data?.objectId || getDynamicFieldObjectYX.data?.objectId || '0x';
    return pool_id
}

//sqrt_price: the pool's sqrt price at the time of the swap (e.g. the event's after_sqrt_price)
export async function calculateFee_USD(ctx: SuiContext, pool: string, amount: number, atob: Boolean, date: Date, sqrt_price: bigint) {
    let vol = 0

    try {
        const poolInfo = await getOrCreatePool(ctx, pool)
        const price_a = await getPriceBySymbol(poolInfo.symbol_a, date)
        const price_b = await getPriceBySymbol(poolInfo.symbol_b, date)
        const { a2b: coin_a2b_price, b2a: coin_b2a_price } = sqrtPriceToPrices(sqrt_price, poolInfo.decimal_a, poolInfo.decimal_b)

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
            else if (price_a) vol = amount * coin_b2a_price * price_a
        }
    }
    catch (e) {
        console.log(`calculate fee error ${e.message} at at ${pool} ${amount}`)
    }

    return vol
}
