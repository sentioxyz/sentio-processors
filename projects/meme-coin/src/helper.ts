import { getPriceByType, token } from "@sentio/sdk/utils"
import { UniswapV3PoolContext } from "./types/eth/uniswapv3pool.js"
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"

interface poolInfo {
    symbol0: string,
    symbol1: string,
    decimal0: number,
    decimal1: number,
    pairName: string,
    //     fee: string
}

let poolInfoMap = new Map<string, Promise<poolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: any, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]
    try {
        name = await getERC20ContractOnContext(ctx, coinAddress).name()
        symbol = await getERC20ContractOnContext(ctx, coinAddress).symbol()
        decimal = Number(await getERC20ContractOnContext(ctx, coinAddress).decimals())
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

export const getOrCreateCoin = async function (ctx: any, coinAddress: string): Promise<token.TokenInfo> {
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

export async function buildPoolInfo(ctx: any, pool: string): Promise<poolInfo> {
    let [symbol0, symbol1, decimal0, decimal1, pairName, fee] = ["", "", 0, 0, "", "", 0]
    try {
        const token0 = await ctx.contract.token0()
        const token1 = await ctx.contract.token1()
        const coinInfo_0 = await getOrCreateCoin(ctx, token0)
        const coinInfo_1 = await getOrCreateCoin(ctx, token1)
        // const fee = await ctx.contract.fee()
        symbol0 = coinInfo_0.symbol
        symbol1 = coinInfo_1.symbol
        decimal0 = coinInfo_0.decimal
        decimal1 = coinInfo_1.decimal
        pairName = symbol0 + "-" + symbol1 + " " //+ fee
        console.log(`build pool ${pairName}`)
    } catch (e) {
        console.log(`${e.message} get pool object error ${pool}`)
    }
    return {
        symbol0,
        symbol1,
        decimal0,
        decimal1,
        pairName,
        // fee
    }
}

export const getOrCreatePool = async function (ctx: any, pool: string): Promise<poolInfo> {
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


export async function getPoolPrice(ctx: any, pool: string) {
    const slot0 = await ctx.contract.slot0()
    const current_sqrt_price = Number(slot0.sqrtPriceX96)
    if (!current_sqrt_price) { console.log(`get pool price error at ${ctx.transactionHash}`) }
    const poolInfo = await getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (poolInfo.decimal1 - poolInfo.decimal0)
    const coin_a2b_price = 1 / coin_b2a_price
    ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
    ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName })
    return coin_a2b_price
}


// export async function calculateValue_USD(ctx: SuiContext | SuiObjectContext, pool: string, amount_a: number, amount_b: number, date: Date) {
//     const poolInfo = await getOrCreatePool(ctx, pool)
//     const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
//     const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
//     const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)

//     const coin_a2b_price = await getPoolPrice(ctx, pool)

//     let [value_a, value_b] = [0, 0]
//     if (price_a) {
//         value_a = amount_a * price_a
//         value_b = amount_b / coin_a2b_price * price_a
//     }
//     else if (price_b) {
//         value_a = amount_a * coin_a2b_price * price_b
//         value_b = amount_b * price_b
//     }
//     else {
//         console.log(`price not in sui coinlist, calculate value failed at ${ctx}`)
//     }

//     return value_a + value_b
// }

// export async function calculateValue_USD(ctx: SuiContext | SuiObjectContext, pool: string, amount_a: number, amount_b: number, date: Date) {
//     let [value_a, value_b] = [0, 0]
//     try {
//         const poolInfo = await getOrCreatePool(ctx, pool)
//         const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
//         const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
//         const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)
//         const coin_a2b_price = await getPoolPrice(ctx, pool)

//         if (price_a) {
//             value_a = amount_a * price_a
//             //handle the case of low liquidity
//             if (price_b) {
//                 value_b = amount_b * price_b
//             }
//             else {
//                 value_b = amount_b / coin_a2b_price * price_a
//             }
//         }
//         else if (price_b) {
//             value_a = amount_a * coin_a2b_price * price_b
//             value_b = amount_b * price_b
//         }
//         else {
//             console.log(`price not in sui coinlist, calculate value failed at coin_a: ${coin_a_full_address},coin_b: ${coin_b_full_address} at at ${pool} ${amount_a} ${amount_b}`)
//         }
//     }
//     catch (e) {
//         console.log(` calculate value error ${e.message} at ${pool} ${amount_a} ${amount_b}`)
//     }
//     return [value_a, value_b]
// }

// export async function calculateSwapVol_USD(event: pool.SwapEventInstance, type: string, amount_in: number, amount_out: number, atob: Boolean, date: Date) {
//     let [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
//     const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
//     const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)

//     let vol = 0
//     if (price_a) {
//         vol = (atob ? amount_in : amount_out) * price_a
//         // console.log(`price a ${coin_a_full_address} ${coin_b_full_address} ${date}`)
//     }
//     else if (price_b) {
//         vol = (atob ? amount_out : amount_in) * price_b
//         // console.log(`price b ${coin_a_full_address} ${coin_b_full_address} ${date}`)
//     }
//     else {
//         console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${event.id.txDigest} ${coin_a_full_address} ${coin_b_full_address} ${date}`)
//     }

//     return vol
// }


// export async function calculateFee_USD(ctx: SuiContext | SuiObjectContext, pool: string, amount: number, atob: Boolean, date: Date) {
//     let vol = 0

//     try {
//         const poolInfo = await getOrCreatePool(ctx, pool)
//         const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
//         const price_a = await getPriceByType(SuiNetwork.MAIN_NET, coin_a_full_address, date)
//         const price_b = await getPriceByType(SuiNetwork.MAIN_NET, coin_b_full_address, date)
//         const coin_a2b_price = await getPoolPrice(ctx, pool)

//         if (!price_a && !price_b) {
//             console.log(`price not in sui coinlist, calculate fee failed at coin_a: ${coin_a_full_address},coin_b: ${coin_b_full_address} at ${pool}`)
//             return 0
//         }

//         if (atob) {
//             if (price_a) vol = amount * price_a
//             else if (price_b) vol = amount * coin_a2b_price * price_b
//         }
//         else {
//             if (price_b) vol = amount * price_b
//             else if (price_a) vol = amount / coin_a2b_price * price_a
//         }
//     }
//     catch (e) {
//         console.log(`calculate fee error ${e.message} at at ${pool} ${amount}`)
//     }

//     return vol
// }