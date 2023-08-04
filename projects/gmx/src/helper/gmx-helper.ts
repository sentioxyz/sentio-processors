import { token } from "@sentio/sdk/utils"
import { EthChainId } from "@sentio/sdk/eth";
import { VaultContext } from "../types/eth/vault.js"
import { EthContext } from "@sentio/sdk/eth";
import { GlpManagerContext } from "../types/eth/glpmanager.js"
import { GMX_ADDRESS, REWARD_ROUTER, VAULT_ADDRESS, esGMX_ADDRESS, sGMX_ADDRESS, GLP_MANAGER_ADDRESS, vGLP_ADDRESS, vGMX_ADDRESS, REWARD_TRACKER_ADDRESS } from './constant.js'
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { GMXContext } from "../types/eth/gmx.js"

//create coin map
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildCoinInfo(ctx: EthContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]
    // console.log(`building ${ctx.getChainId()} ${coinAddress}`)
    try {
        symbol = await getERC20ContractOnContext(ctx, coinAddress).symbol()
        decimal = Number(await getERC20ContractOnContext(ctx, coinAddress).decimals())
        name = await getERC20ContractOnContext(ctx, coinAddress).name()
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

export const getOrCreateCoin = async function (ctx: EthContext, coinAddress: string): Promise<token.TokenInfo> {
    let coinInfo = coinInfoMap.get(coinAddress)
    if (!coinInfo) {
        coinInfo = buildCoinInfo(ctx, coinAddress)
        coinInfoMap.set(coinAddress, coinInfo)
        console.log(`set coinInfoMap for ${(await coinInfo).name}`)
    }
    return coinInfo
}


//gauge each asset in pool
export const gaugeTokenAum = async (_: any, ctx: VaultContext) => {
    const allWhitelistedTokensLength = await ctx.contract.allWhitelistedTokensLength({ blockTag: ctx.blockNumber })
    let address = ""
    for (let i = 0; i < allWhitelistedTokensLength; i++) {
        address = (await ctx.contract.allWhitelistedTokens(i, { blockTag: ctx.blockNumber })).toLowerCase()
        const token = await getOrCreateCoin(ctx, address)
        try {
            const tokenAum = Number(await getERC20ContractOnContext(ctx, address).balanceOf(VAULT_ADDRESS)) / Math.pow(10, token.decimal)
            // console.log("tokenAum", tokenAum, WhitelistTokenMap[address].decimal, WhitelistTokenMap[address].symbol, ctx.timestamp)
            ctx.meter.Gauge("tokenAum").record(tokenAum, { coin_symbol: token.symbol })
        } catch (e) { console.log(`gauge token aum error ${token.symbol} ${ctx.timestamp}`) }
    }
}

//
export const gaugeStakedAssets = async (_: any, ctx: GMXContext) => {
    //record staked gmx amount using gmx.balanceOf(sGMX)
    try {
        const stakedGmx = Number(await getERC20ContractOnContext(ctx, GMX_ADDRESS).balanceOf(sGMX_ADDRESS)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedGmx").record(stakedGmx)
    } catch (e) { console.log(`error 2 ${ctx.timestamp}`) }
    //record staked esGMX
    try {
        const stakedEsGmx = Number(await getERC20ContractOnContext(ctx, esGMX_ADDRESS).balanceOf(sGMX_ADDRESS)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedEsGmx").record(stakedEsGmx)
    } catch (e) { console.log(`error 3 ${ctx.timestamp}`) }
    //record vested esGMX in vGLP
    try {
        const vGLP = Number(await getERC20ContractOnContext(ctx, esGMX_ADDRESS).balanceOf(vGLP_ADDRESS)) / Math.pow(10, 18)
        ctx.meter.Gauge("vGLP").record(vGLP)
    } catch (e) { console.log(`error 5 ${ctx.timestamp}`) }
    //record vested esGMX in vGMX
    try {
        const vGMX = Number(await getERC20ContractOnContext(ctx, esGMX_ADDRESS).balanceOf(vGMX_ADDRESS)) / Math.pow(10, 18)
        ctx.meter.Gauge("vGMX").record(vGMX)
    } catch (e) { console.log(`error 6 ${ctx.timestamp}`) }
}

// let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

// export async function buildTokenInfo(ctx: VaultContext | GlpManagerContext, tokenAddress: string): Promise<token.TokenInfo> {
//     let tokenInfo: token.TokenInfo
//     try {
//         tokenInfo = await token.getERC20TokenInfo(ctx, tokenAddress)
//         console.log(`build coin info ${tokenInfo.symbol} ${tokenInfo.decimal} ${tokenInfo.name}`)
//         return tokenInfo
//     } catch (e) {
//         console.log("get token failed ", e.message, tokenAddress, ctx.chainId)
//     }
//     return {
//         decimal: 100,
//         symbol: "unk",
//         name: "unk"
//     }
// }

// export const getOrCreateToken = async function (ctx: VaultContext | GlpManagerContext, tokenAddress: string): Promise<token.TokenInfo> {
//     let tokenInfo = coinInfoMap.get(tokenAddress)
//     if (!tokenInfo) {
//         tokenInfo = buildTokenInfo(ctx, tokenAddress)
//         coinInfoMap.set(tokenAddress, tokenInfo)
//         console.log("set coinInfoMap for " + tokenAddress)
//     }
//     return await tokenInfo
// }
