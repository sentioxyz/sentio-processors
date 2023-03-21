// @ts-ignore
import {
    BurnEvent,
    MintEvent,
    SwapEvent,
    UniswapPoolContext,
    UniswapPoolProcessor,
} from './types/eth/uniswappool.js'
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { getPriceByType,  token } from "@sentio/sdk/utils"
import { BigDecimal, CHAIN_IDS, Gauge, MetricOptions } from "@sentio/sdk";

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        return await token.getERC20TokenInfo(address)
    } else {
        return token.NATIVE_ETH
    }
}

export const gaugeOptions: MetricOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

interface poolInfo {
    token0: token.TokenInfo
    token1: token.TokenInfo
    token0Address: string
    token1Address: string
    fee: string
    ethToUSDCPrice: number
}

interface lpInfo {
    token0Amount: BigDecimal
    token1Amount: BigDecimal
    mintPrice: BigDecimal
}

let poolInfoMap = new Map<string, Promise<poolInfo>>()
let ownerMap = new Map<string, Promise<lpInfo>>()

async function buildLpInfo(token0: BigDecimal, token1: BigDecimal, mintPrice: BigDecimal): Promise<lpInfo> {
    return {
        token0Amount: token0,
        token1Amount: token1,
        mintPrice: mintPrice,
    }
}

async function updateLpInfo(lpInfo: Promise<lpInfo>, token0: BigDecimal, token1: BigDecimal, currPrice: BigDecimal): Promise<lpInfo> {
    const lpInfoValue = await lpInfo
    return {
        token0Amount: lpInfoValue.token0Amount.plus(token0),
        token1Amount: lpInfoValue.token1Amount.plus(token1),
        mintPrice: lpInfoValue.mintPrice.plus(currPrice),
    }
}
export const vol = Gauge.register("vol", gaugeOptions)
async function buildPoolInfo(token0Promise: Promise<string>,
                             token1Promise: Promise<string>,
                             feePromise: Promise<bigint>): Promise<poolInfo> {
    const address0 = await token0Promise
    const address1 = await token1Promise
    const tokenInfo0 = await getTokenInfo(address0)
    const tokenInfo1 = await getTokenInfo(address1)
    return {
        token0: tokenInfo0,
        token1: tokenInfo1,
        token0Address: address0,
        token1Address: address1,
        fee: (await feePromise).toString(),
        ethToUSDCPrice: 0,
    }
}

async function getValue(ctx: UniswapPoolContext, address: string, info: token.TokenInfo):
    Promise<BigDecimal> {
    let amount: bigint
    if (info.symbol === "ETH") {
        try {
            amount = await ctx.contract.provider!.getBalance(ctx.address)
        } catch (e) {
            console.log(e)
            amount = 0n
        }
    } else {
        try {
            amount = await getERC20Contract(address).balanceOf(ctx.address,
                {blockTag: Number(ctx.blockNumber)})
        } catch (e) {
            console.log("error", e)
            amount = 0n
        }
    }
    return amount.scaleDown(info.decimal)
}

async function getTVL(ctx: UniswapPoolContext, info: token.TokenInfo, token :string): Promise<BigDecimal> {
    const amount = await getValue(ctx, token, info)
    const price = await getPriceByType("1", token, ctx.timestamp) || 0
    return amount.multipliedBy(price)
}

const calculateIL = async function (_:any, ctx: UniswapPoolContext){
    const info = await getOrCreatePool(ctx)
    for (let [key, value] of ownerMap) {
        const lpInfo = await value
        let currValue = lpInfo.token0Amount.plus(lpInfo.token1Amount.multipliedBy(info.ethToUSDCPrice))
        let impermanentLoss = lpInfo.mintPrice.minus(currValue)
        ctx.meter.Gauge("impermanentLoss").record(impermanentLoss, {owner: key})
    }
}

const getOrCreatePool = async function (ctx: UniswapPoolContext) :Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(ctx.address)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx.contract.token0(), ctx.contract.token1(), ctx.contract.fee())
        poolInfoMap.set(ctx.address, infoPromise)
        console.log("set poolInfoMap for " + ctx.address)
    }
    return await infoPromise
}

const priceCalc = async function (_:any, ctx: UniswapPoolContext) {
    const info = await getOrCreatePool(ctx)
    const tvl0 = await getTVL(ctx, info.token0, info.token0Address)
    const tvl1 = await getTVL(ctx, info.token1, info.token1Address)
    let pool = "USDC/ETH-" +  Number(info.fee) / 10000 + "%"
    ctx.meter.Gauge("tvl").record(tvl0, {token: info.token0.symbol,
        poolName: pool})
    ctx.meter.Gauge("tvl").record(tvl1, {token: info.token1.symbol,
        poolName: pool})
}

async function getToken(ctx: UniswapPoolContext, info: token.TokenInfo, address :string, amount: bigint):
    Promise<[BigDecimal, BigDecimal]> {
    let scaledAmount = amount.scaleDown(info.decimal)
    const price = await getPriceByType(CHAIN_IDS.ETHEREUM, address, ctx.timestamp) || 0
    return [scaledAmount, scaledAmount.multipliedBy(price)]
}

let address="0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
UniswapPoolProcessor.bind({address: address}).onEventSwap(async function(event: SwapEvent, ctx: UniswapPoolContext) {
    let info = await getOrCreatePool(ctx)
    let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
    let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
    let name= "USDC/ETH-" +  Number(info.fee) / 10000 + "%"
    vol.record(ctx,
        token0Price.abs(),
        {
            poolName: name,
            type: "swap",
        })
    ctx.eventLogger.emit("Swap",
        {
            distinctId: event.args.recipient,
            poolName: name,
            amount: token0Price,
            message: name + " swap " + token0Amount.abs().toString() + " " +
                info.token0.symbol + " for " + token1Amount.abs().toString() + " " + info.token1.symbol,
        })
    let sqrtPriceX96 = event.args.sqrtPriceX96
    let uSDCToEthPrice = Number(sqrtPriceX96)**2 / (2 ** 192)
    let ethUSDCPrice = (1/uSDCToEthPrice) *10**12
    info.ethToUSDCPrice = ethUSDCPrice

    ctx.meter.Gauge("ethToUSDCPrice").record(ethUSDCPrice, {token: info.token0.symbol,
        poolName: name})
    ctx.meter.Counter("total_tokens").add(token0Amount,
        {token: info.token0.symbol, poolName: name})
    ctx.meter.Counter("total_tokens").add(token1Amount,
        {token: info.token1.symbol, poolName: name})
}).onTimeInterval(priceCalc, 60, 24 * 60 * 30).onTimeInterval(calculateIL, 60*24, 24 * 60 * 30)
    .onEventBurn(async function (event: BurnEvent, ctx: UniswapPoolContext) {
        let info = await getOrCreatePool(ctx)
        let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
        let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
        let name= "USDC/ETH-" +  Number(info.fee) / 10000 + "%"
        let total = token0Price.abs().plus(token1Price.abs())

        let lpInfo = ownerMap.get(event.args.owner)
        if(!lpInfo){
            console.log("No Liquidity provider with distinctId: " + event.args.owner)
        }else{
            lpInfo =updateLpInfo(lpInfo, token0Amount.negated(), token1Amount.negated(), total.negated())
            ownerMap.set(event.args.owner, lpInfo)
        }

        vol.record(ctx,
            total,
            {
                poolName: name,
                type: "burn",
            })
        ctx.eventLogger.emit("Burn",
            {
                distinctId: event.args.owner,
                poolName: name,
                amount: total,
                message: name + " burn " + token0Amount.abs().toString() +
                    " " + info.token0.symbol + " and " +
                    token1Amount.abs().toString() + " " + info.token1.symbol,
            })
        ctx.meter.Counter("total_tokens").sub(token0Amount,
            {token: info.token0.symbol, poolName: name})
        ctx.meter.Counter("total_tokens").sub(token1Amount,
            {token: info.token1.symbol, poolName: name})
    })
    .onEventMint(async function (event: MintEvent, ctx: UniswapPoolContext) {
        let info = await getOrCreatePool(ctx)
        let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
        let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
        let name= "USDC/ETH-" +  Number(info.fee) / 10000 + "%"
        let total = token0Price.abs().plus(token1Price.abs())

        let lpInfo = ownerMap.get(event.args.owner)
        if (!lpInfo) {
            lpInfo =buildLpInfo(token0Amount, token1Amount, total)
            ownerMap.set(event.args.owner, lpInfo)
            console.log("Add new Liquidity provider with distinctId: " + event.args.owner)
        }else{
            lpInfo =updateLpInfo(lpInfo, token0Amount, token1Amount, total)
            ownerMap.set(event.args.owner, lpInfo)
        }

        vol.record(ctx,
            total,
            {poolName: name,
                type: "mint",
            })

        ctx.eventLogger.emit("Mint", {
            distinctId: event.args.owner,
            poolName: name,
            amount: total,
            message: name + " mint " +
                token0Amount.abs().toString() + " " +
                info.token0.symbol + " and " +
                token1Amount.abs().toString() + " " + info.token1.symbol,
        })
        ctx.meter.Counter("total_tokens").add(token0Amount,
            {token: info.token0.symbol, poolName: name})
        ctx.meter.Counter("total_tokens").add(token1Amount,
            {token: info.token1.symbol, poolName: name})
    })