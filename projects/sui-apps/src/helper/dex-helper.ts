import { SuiContext, SuiObjectContext, SuiNetwork } from "@sentio/sdk/sui"
import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from "./constant.js"
import { SuiEvent } from "@mysten/sui.js/client"
import { WHITELISTED_TYPE_MAP } from "./constant.js";
import { MoveFetchConfig, EventFilter } from "@sentio/sdk/move";


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
        // console.log("turbos type", type)
        const regex = /(?:<|>|,|\s)([^<>,\s]+)/g
        const matches = type.match(regex)
        //@ts-ignore
        console.log("matches", matches[0], matches[1])

        if (matches && matches.length == 3)
            return [matches[0].slice(1), matches[1].slice(1)]
    }
    else if (type.includes(constant.FLOWX_LP_OBJECT_TYPE)) {
        // console.log("flowx type", type)
        const regex = /PairMetadata<([^<>]*)>/
        const matches = type.match(regex)
        if (matches && matches.length > 1) {
            const substringsInsidePairMetadata = matches[1].split(',');
            if (substringsInsidePairMetadata.length === 2) {
                // console.log("flowx type returned", substringsInsidePairMetadata[0].trim(), substringsInsidePairMetadata[1].trim())
                return [substringsInsidePairMetadata[0].trim(), substringsInsidePairMetadata[1].trim()];
            }
        }
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

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
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
        console.log(`${e.message} get coin metadata error ${coinAddress} `)
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
        if (type.includes(constant.FLOWX_LP_OBJECT_TYPE)) {
            //@ts-ignore
            fee = Number(obj.data?.content.fields.value.fields.fee_rate) / 10 ** 4
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


export async function recordClmmV3SwapEvent(event: SuiEvent, ctx: SuiContext) {
    let [project, amount_in, amount_out, atob] = ["", 0, 0, false]
    //@ts-ignore
    const pool = event.parsedJson.pool

    const poolInfo: poolInfo = await getOrCreatePool(ctx, pool)

    if (event.type.includes(constant.CETUS_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.parsedJson.atob
        //@ts-ignore
        amount_in = Number(event.parsedJson.amount_in) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        //@ts-ignore
        amount_out = Number(event.parsedJson.amount_out) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "cetus"
    }
    if (event.type.includes(constant.TURBOS_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.parsedJson.a_to_b
        //@ts-ignore
        const amount_a = Number(event.parsedJson.amount_a) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        const amount_b = Number(event.parsedJson.amount_b) / Math.pow(10, poolInfo.decimal_b)
        amount_in = atob ? amount_a : amount_b
        amount_out = atob ? amount_b : amount_a
        project = "turbos"
    }

    const usd_volume = await calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        type_in: atob ? poolInfo.symbol_a : poolInfo.symbol_b,
        amount_out,
        type_out: atob ? poolInfo.symbol_b : poolInfo.symbol_a,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

export async function recordAmmV2SwapEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = (event.type.includes(constant.KRIYA_SWAP_TYPE) || event.type.includes(constant.FLOWX_SWAP_TYPE)) ? event.parsedJson.pool_id : event.parsedJson.id
    const poolInfo: poolInfo = await getOrCreatePool(ctx, pool)

    //atob
    let atob = false
    let [amount_in, amount_out, project] = [0, 0, "unk"]
    //for kriya
    if (event.type.includes(constant.KRIYA_SWAP_TYPE)) {
        const swapCoin = event.type.substring(event.type.indexOf('<') + 1, event.type.indexOf('>'));
        atob = (poolInfo.type_a == swapCoin)
        console.log("atob", swapCoin, poolInfo.type_a, pool, event.type)
        //@ts-ignore
        amount_in = Number(event.parsedJson.amount_in) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        //@ts-ignore
        amount_out = Number(event.parsedJson.amount_out) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "kriya"
    }
    if (event.type.includes(constant.FLOWX_SWAP_TYPE)) {
        //@ts-ignore
        atob = (event.parsedJson.amount_x_in > event.parsedJson.amount_x_out)
        //@ts-ignore
        const amount_x = Number(event.parsedJson.amount_x_in) - Number(event.parsedJson.amount_x_out)
        //@ts-ignore
        const amount_y = Number(event.parsedJson.amount_y_in) - Number(event.parsedJson.amount_y_out)
        amount_in = Math.abs(atob ? amount_x : amount_y) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        amount_out = Math.abs(atob ? amount_y : amount_x) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "flowx"
    }
    if (event.type.includes(constant.IPX_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.type.includes("SwapTokenX")
        //@ts-ignore
        const amount_x = atob ? Number(event.parsedJson.coin_x_in) : Number(event.parsedJson.coin_x_out)
        //@ts-ignore
        const amount_y = atob ? Number(event.parsedJson.coin_y_out) : Number(event.parsedJson.coin_y_in)
        amount_in = (atob ? amount_x : amount_y) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        amount_out = (atob ? amount_y : amount_x) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "ipx"
    }

    //@ts-ignore
    const usd_volume = await calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        type_in: atob ? poolInfo.symbol_a : poolInfo.symbol_b,
        amount_out,
        type_out: atob ? poolInfo.symbol_b : poolInfo.symbol_a,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

export async function recordClobSwapEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = event.parsedJson.pool_id
    const poolInfo: poolInfo = await getOrCreatePool(ctx, pool)

    let atob = false
    let [amount_in, amount_out, project] = [0, 0, "unk"]

    if (event.type.includes(constant.DEEPBOOK_TYPE)) {
        //is_bid true: quote b ->base a, false: base a -> quote b, doc issue?
        //@ts-ignore
        atob = event.parsedJson.is_bid
        //@ts-ignore
        const p_r = Math.pow(10, poolInfo.decimal_a - poolInfo.decimal_b - 9) * Number(event.parsedJson.price) //calculate priceInRealWorld
        //@ts-ignore
        const amount_a = Number(event.parsedJson.base_asset_quantity_filled) / Math.pow(10, poolInfo.decimal_a)
        const amount_b = amount_a * p_r
        amount_in = atob ? amount_a : amount_b
        amount_out = atob ? amount_b : amount_a
        project = "deepbook"
    }

    //@ts-ignore
    const usd_volume = await calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        type_in: atob ? poolInfo.symbol_a : poolInfo.symbol_b,
        amount_out,
        type_out: atob ? poolInfo.symbol_b : poolInfo.symbol_a,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

export async function recordMultiAssetSwapEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = event.parsedJson.pool_id

    const multiAssetPoolInfo: multiAssetPoolInfo = await getOrCreateMultiAssetPool(ctx, pool)

    let project = ""
    let amounts_in: number[] = []
    let amounts_out: number[] = []
    let types_in: string[] = []
    let types_out: string[] = []
    let symbols_in: string[] = []
    let symbols_out: string[] = []

    if (event.type.includes(constant.AFTERMATH_SWAP_TYPE)) {
        //@ts-ignore
        for (let i = 0; i < event.parsedJson.amounts_in.length; i++) {
            //@ts-ignore
            const coinType = "0x" + event.parsedJson.types_in[i]
            types_in.push(coinType)
            //@ts-ignore
            const coinInfo = await getOrCreateCoin(ctx, coinType)
            //@ts-ignore
            const amount = Number(event.parsedJson.amounts_in[i]) / Math.pow(10, coinInfo.decimal)
            amounts_in.push(amount)
            symbols_in.push(coinInfo.symbol)
        }

        //@ts-ignore
        for (let i = 0; i < event.parsedJson.amounts_out.length; i++) {
            //@ts-ignore
            const coinType = "0x" + event.parsedJson.types_out[i]
            types_out.push(coinType)
            //@ts-ignore
            const coinInfo = await getOrCreateCoin(ctx, coinType)

            //@ts-ignore
            const amount = Number(event.parsedJson.amounts_out[i]) / Math.pow(10, coinInfo.decimal)
            amounts_out.push(amount)
            symbols_out.push(coinInfo.symbol)
        }

        project = "aftermath"
    }

    const usd_volume = await calculateMultiAssetSwapVol_USD(ctx, multiAssetPoolInfo, types_in, types_out, symbols_in, symbols_out, amounts_in, amounts_out)

    try {
        if (amounts_in.length == 1 && amounts_out.length == 1) {
            ctx.eventLogger.emit("dex.swapEvents", {
                //@ts-ignore
                distinctId: ctx.transaction.transaction.data.sender,
                pool,
                amount_in: amounts_in[0],
                type_in: types_in[0],
                amount_out: amounts_out[0],
                type_out: types_out[0],
                usd_volume,
                pairName: multiAssetPoolInfo.pairName,
                project,
                message: `Swap ${amounts_in[0]} ${types_in[0]} to ${amounts_out[0]} ${types_out[0]}. USD value: ${usd_volume} in Pool ${multiAssetPoolInfo.pairName} `
            })
        }
        else
            ctx.eventLogger.emit("dex.swapMultiTokenEvents", {
                //@ts-ignore
                distinctId: ctx.transaction.transaction.data.sender,
                pool,
                usd_volume,
                pairName: multiAssetPoolInfo.pairName,
                project,
                message: `Swap ${JSON.stringify(amounts_in)} ${JSON.stringify(symbols_in)} to ${JSON.stringify(amounts_out)} ${JSON.stringify(symbols_out)}. USD value: ${usd_volume} in Pool ${multiAssetPoolInfo.pairName} `
            })
    }
    catch (e) {
        console.log(`${e.message} record error at ${ctx.transaction.digest} ${multiAssetPoolInfo.pool}`)
    }
}

export async function logLiquidityEvents(ctx: SuiContext, isDeposit: boolean, pool: string, amounts: number[], types: string[], symbols: string[], usd_volumes: number[], total_usd_volume: number, pairName: string, project: string) {

    ctx.eventLogger.emit(`dex.${isDeposit ? "Add" : "Remove"}LiquidityEvents`, {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        total_usd_volume,
        pairName,
        project,
        message: `${isDeposit ? "Add" : "Remove"}Liquidity ${JSON.stringify(amounts)} ${JSON.stringify(symbols)} ${JSON.stringify(types)}. ${JSON.stringify(usd_volumes)} USD value: ${total_usd_volume} in Pool ${pairName} `
    })

    for (let i = 0; i < amounts.length; i++) {
        ctx.eventLogger.emit(`dex.${isDeposit ? "Add" : "Remove"}LiquiditySingleAssetEvents`, {
            //@ts-ignore
            distinctId: ctx.transaction.transaction.data.sender,
            pool,
            amount: amounts[i],
            usd_volume: usd_volumes[i],
            symbol: symbols[i],
            type: types[i],
            total_usd_volume,
            pairName,
            project,
            message: `${isDeposit ? "Add" : "Remove"}Liquidity ${amounts[i]} ${types[i]}, USD$${usd_volumes[i]}. total USD value: ${total_usd_volume} in Pool ${pairName} `
        })
    }
}

export async function recordClmmV3LiquidityEvent(event: SuiEvent, ctx: SuiContext) {
    let [project, amount_a, amount_b, isDeposit] = ["", 0, 0, false]
    //@ts-ignore
    const pool = event.parsedJson.pool
    const poolInfo: poolInfo = await getOrCreatePool(ctx, pool)

    if (event.type.includes(constant.CETUS_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.CETUS_REMOVE_LIQUIDITY_TYPE)) {
        isDeposit = event.type.includes(constant.CETUS_ADD_LIQUIDITY_TYPE)
        //@ts-ignore
        amount_a = Number(event.parsedJson.amount_a) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        amount_b = Number(event.parsedJson.amount_b) / Math.pow(10, poolInfo.decimal_b)
        project = "cetus"
    }

    if (event.type.includes(constant.TURBOS_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.TURBOS_REMOVE_LIQUIDITY_TYPE)) {
        isDeposit = event.type.includes(constant.TURBOS_ADD_LIQUIDITY_TYPE)
        //@ts-ignore
        amount_a = Number(event.parsedJson.amount_a) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        amount_b = Number(event.parsedJson.amount_b) / Math.pow(10, poolInfo.decimal_b)
        project = "turbos"
    }

    const usd_volume = await calculateValueUSD(ctx, poolInfo, amount_a, amount_b)
    const usd_volume_a = await calculateSingleTypeValueUSD(ctx, poolInfo.type_a, amount_a)
    const usd_volume_b = await calculateSingleTypeValueUSD(ctx, poolInfo.type_b, amount_b)

    await logLiquidityEvents(ctx, isDeposit, pool, [amount_a, amount_b], [poolInfo.type_a, poolInfo.type_a], [poolInfo.symbol_a, poolInfo.symbol_b], [usd_volume_a, usd_volume_b], usd_volume, poolInfo.pairName, project)

}

export async function recordAmmV2LiquidityEvent(event: SuiEvent, ctx: SuiContext) {
    let [amount_a, amount_b, project, isDeposit] = [0, 0, "unk", false]
    let pool
    let poolInfo: poolInfo

    if (event.type.includes(constant.KRIYA_PACKAGE_ID)) {
        //@ts-ignore
        pool = event.parsedJson.pool_id
        poolInfo = await getOrCreatePool(ctx, pool)
        isDeposit = event.type.includes(constant.KRIYA_ADD_LIQUIDITY_TYPE)
        //@ts-ignore
        amount_a = Number(event.parsedJson.amount_x) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        amount_b = Number(event.parsedJson.amount_y) / Math.pow(10, poolInfo.decimal_b)
        project = "kriya"
    }

    if (event.type.includes(constant.FLOWX_PACKAGE_ID)) {
        //@ts-ignore
        // console.log("entering flowx liquidity", event.parsedJson.coin_x, event.parsedJson.coin_y)
        //@ts-ignore
        pool = await getFlowXPoolId(ctx, event.parsedJson.coin_x, event.parsedJson.coin_y)
        poolInfo = await getOrCreatePool(ctx, pool)

        isDeposit = event.type.includes(constant.FLOWX_ADD_LIQUIDITY_TYPE)
        //@ts-ignore
        amount_a = Number(event.parsedJson.amount_x) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        amount_b = Number(event.parsedJson.amount_y) / Math.pow(10, poolInfo.decimal_b)
        project = "flowx"
    }

    if (event.type.includes(constant.IPX_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.IPX_REMOVE_LIQUIDITY_TYPE)) {
        console.log("entering ipx liquidity", event.type)
        //@ts-ignore
        pool = event.parsedJson.id
        poolInfo = await getOrCreatePool(ctx, pool)

        isDeposit = event.type.includes(constant.IPX_ADD_LIQUIDITY_TYPE)
        //@ts-ignore
        amount_a = Number(isDeposit ? event.parsedJson.coin_x_amount : event.parsedJson.coin_x_out) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        amount_b = Number(isDeposit ? event.parsedJson.coin_y_amount : event.parsedJson.coin_x_out) / Math.pow(10, poolInfo.decimal_b)
        project = "ipx"
    }

    //@ts-ignore
    const usd_volume = await calculateValueUSD(ctx, poolInfo, amount_a, amount_b)
    //@ts-ignore
    const usd_volume_a = await calculateSingleTypeValueUSD(ctx, poolInfo.type_a, amount_a)
    //@ts-ignore
    const usd_volume_b = await calculateSingleTypeValueUSD(ctx, poolInfo.type_b, amount_b)
    //@ts-ignore
    await logLiquidityEvents(ctx, isDeposit, pool, [amount_a, amount_b], [poolInfo.type_a, poolInfo.type_a], [poolInfo.symbol_a, poolInfo.symbol_b], [usd_volume_a, usd_volume_b], usd_volume, poolInfo.pairName, project)

}

export async function recordClobLiquidityEvent(event: SuiEvent, ctx: SuiContext) {

}

export async function recordMultiAssetLiquidityEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = event.parsedJson.pool_id
    const multiAssetPoolInfo: multiAssetPoolInfo = await getOrCreateMultiAssetPool(ctx, pool)
    let usd_volume = 0
    const amounts: number[] = []
    const symbols: string[] = []
    const types: string[] = []
    const usd_volumes: number[] = []
    const isDeposit = event.type.includes(constant.AFTERMATH_ADD_LIQUIDITY_TYPE)
    //@ts-ignore
    for (let i = 0; i < event.parsedJson.types.length; i++) {
        //@ts-ignore
        const coinType = `0x${event.parsedJson.types[i]}`
        //@ts-ignore
        const coinInfo = await getOrCreateCoin(ctx, coinType)
        let amount = 0
        if (isDeposit) {
            //@ts-ignore
            amount = Number(event.parsedJson.deposits[i]) / Math.pow(10, coinInfo.decimal)
        }
        else {
            //@ts-ignore
            amount = Number(event.parsedJson.withdrawn[i]) / Math.pow(10, coinInfo.decimal)
        }
        amounts.push(amount)
        symbols.push(coinInfo.symbol)
        types.push(coinType)
        let price = null
        try {
            price = (await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp))!
        }
        catch (e) {
            console.log(`${e.message} price not in sui coinlist, calculateMultiAsset ${ctx.transaction.digest} ${multiAssetPoolInfo.pool}`)
        }
        if (price) {
            usd_volumes.push(price * amount)
            usd_volume += price * amount
        }
        else {
            ctx.eventLogger.emit("PriceNotSupported", {
                type: coinType,
                pool: multiAssetPoolInfo.pool,
                pairName: multiAssetPoolInfo.pairName
            })
        }
    }

    await logLiquidityEvents(ctx, isDeposit, pool, amounts, types, symbols, usd_volumes, usd_volume, multiAssetPoolInfo.pairName, "aftermath")

}
