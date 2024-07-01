import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils"
import { UniswapV3PoolContext } from "./types/eth/uniswapv3pool.js"
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { BigDecimal } from "@sentio/sdk"

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


export async function getPoolPrice(ctx: any) {
    const slot0 = await ctx.contract.slot0()
    const current_sqrt_price = new BigDecimal(slot0.sqrtPriceX96.toString())
    if (!current_sqrt_price) { console.log(`get pool price error at ${ctx.transactionHash}`) }

    const poolInfo = await getOrCreatePool(ctx, ctx.address)
    const pairName = poolInfo.pairName
    const two96 = new BigDecimal(2).pow(96)
    const baseConversion = new BigDecimal(10).pow(poolInfo.decimal1).div(new BigDecimal(10).pow(poolInfo.decimal0))

    const coin_a2b_price = current_sqrt_price.div(two96).pow(2).div(baseConversion)

    ctx.meter.Gauge("a2b_price").record(coin_a2b_price.toString(), { pairName })

    return coin_a2b_price
}

export async function calculateTvl(ctx: any, amount0: number, amount1: number) {
    let [tvl0, tvl1] = [0, 0]
    try {
        const poolInfo = await getOrCreatePool(ctx, ctx.address)
        const price0 = await getPriceBySymbol(poolInfo.symbol0, ctx.timestamp)
        // const price1 = await getPriceBySymbol(poolInfo.symbol1, ctx.timestamp)
        const coin_a2b_price = await getPoolPrice(ctx)

        if (price0) {
            tvl0 = amount0 * price0
            //handle the case of low liquidity
            // if (price1) {
            //     tvl1 = amount1 * price1
            // }
            // else {
            tvl1 = amount1 / Number(coin_a2b_price) * price0
            // }
        }
        // else if (price1) {
        //     tvl0 = amount0 * Number(coin_a2b_price) * price1
        //     tvl1 = amount1 * price1
        // }
        else {
            console.log(`price not found: pool ${ctx.address} `)
        }
    }
    catch (e) {
        console.log(` calculate tvl error ${e.message} at ${ctx.address} ${ctx.timestamp}`)
    }
    return [tvl0, tvl1]
}