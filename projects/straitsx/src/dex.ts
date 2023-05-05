import { UniswapProcessor, UniswapContext } from "./types/eth/uniswap.js";
import { token } from "@sentio/sdk/utils";

export const XSGD_ETH_POOLS = [
    "0x6279653c28f138c8b31b8a0f6f8cd2c58e8c1705",  //XSGD/USDC 0.05%
    "0xbc32d18c5c1138094dabeb3b4d5b720db75c823c",  //WBTC/XSGD 0.3%
    "0xfca9090d2c91e11cc546b0d7e4918c79e0088194",  //XSGD/ETH 0.05%
]

async function getTokenInfo(ctx: UniswapContext, address: string): Promise<token.TokenInfo> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        return await token.getERC20TokenInfo(ctx, address)
    } else {
        return token.NATIVE_ETH
    }
}

interface poolInfo {
    token0: token.TokenInfo
    token1: token.TokenInfo
    token0Address: string
    token1Address: string
    fee: string
    realTimePrice: number
}


async function buildPoolInfo(ctx: UniswapContext): Promise<poolInfo> {
    const address0 = await ctx.contract.token0()
    const address1 = await ctx.contract.token1()
    const tokenInfo0 = await getTokenInfo(ctx, address0)
    const tokenInfo1 = await getTokenInfo(ctx, address1)
    return {
        token0: tokenInfo0,
        token1: tokenInfo1,
        token0Address: address0,
        token1Address: address1,
        fee: (await ctx.contract.fee()).toString(),
        realTimePrice: 0,
    }
}

let poolInfoMap = new Map<string, Promise<poolInfo>>()


const getOrCreatePool = async function (ctx: UniswapContext): Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(ctx.address)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx)
        poolInfoMap.set(ctx.address, infoPromise)
        console.log("set poolInfoMap for " + ctx.address)
    }
    return await infoPromise
}

// async function getToken(ctx: UniswapContext, info: token.TokenInfo, address: string, amount: bigint):
//     Promise<[BigDecimal, BigDecimal]> {
//     let scaledAmount = amount.scaleDown(info.decimal)
//     const price = await getPriceByType(CHAIN_IDS.ETHEREUM, address, ctx.timestamp) || 0
//     return [scaledAmount, scaledAmount.multipliedBy(price)]
// }

const poolName = function (token0: string, token1: string, fee: string) {
    const feeNum = Number(fee) / 10000
    return token0 + "/" + token1 + "-" + feeNum + "%"
}


const uniswapHandler = async (_: any, ctx: any) => {
    const slot0 = await ctx.contract.slot0()
    let sqrtPriceX96 = slot0.sqrtPriceX96
}


for (const pools in XSGD_ETH_POOLS) {
    UniswapProcessor.bind({ address: pools })
        .onTimeInterval(uniswapHandler)
}