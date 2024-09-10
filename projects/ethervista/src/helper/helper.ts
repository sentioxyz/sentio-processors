import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { token } from "@sentio/sdk/utils"
import { PairCreatedEventObject } from "../types/eth/ethervistafactory.js"
import { getEtherVistaPairContract, getEtherVistaPairContractOnContext } from "../types/eth/ethervistapair.js"

interface poolInfo {
    symbol0: string,
    symbol1: string,
    decimal0: number,
    decimal1: number,
    pairName: string
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
    }
    return coinInfo
}

export async function buildPoolInfo(ctx: any, pairAddress: string): Promise<poolInfo> {
    let [symbol0, symbol1, decimal0, decimal1, pairName] = ["", "", 0, 0, "", ""]
    try {
        const token0 = await getEtherVistaPairContractOnContext(ctx, pairAddress).token0()
        const token1 = await getEtherVistaPairContractOnContext(ctx, pairAddress).token1()
        const coinInfo_0 = await getOrCreateCoin(ctx, token0)
        const coinInfo_1 = await getOrCreateCoin(ctx, token1)
        symbol0 = coinInfo_0.symbol
        symbol1 = coinInfo_1.symbol
        decimal0 = coinInfo_0.decimal
        decimal1 = coinInfo_1.decimal
        pairName = symbol0 + "-" + symbol1
        console.log(`build pool ${pairName}`)
    } catch (e) {
        console.log(`${e.message} get pool error ${pairAddress}`)
    }
    return {
        symbol0,
        symbol1,
        decimal0,
        decimal1,
        pairName
    }
}

export async function getOrCreatePair(ctx: any, pairAddress: string): Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(pairAddress)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx, pairAddress)
        poolInfoMap.set(pairAddress, infoPromise)
    }
    return infoPromise
}