import { FulContext } from "../types/eth/ful.js"
import { VaultContext } from "../types/eth/vault.js"
import { EthContext } from "@sentio/sdk/eth"
import { FUL_ADDRESS_MAP, sFUL_ADDRESS_MAP, esFUL_ADDRESS_MAP, vFLP_ADDRESS_MAP, vFUL_ADDRESS_MAP, VAULT_ADDRESS_MAP, FUL_MANAGER_ADDRESS_MAP, REWARD_ROUTER_ADDRESS_MAP } from './constant.js'
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { token } from "@sentio/sdk/utils"



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
    const whitelistedTokenCount = await ctx.contract.whitelistedTokenCount({ blockTag: ctx.blockNumber })
    let address = ""
    for (let i = 0; i < whitelistedTokenCount; i++) {
        address = (await ctx.contract.whitelistedTokens(i, { blockTag: ctx.blockNumber })).toLowerCase()
        const token = await getOrCreateCoin(ctx, address)
        try {
            const tokenAum = Number(await getERC20ContractOnContext(ctx, address).balanceOf(VAULT_ADDRESS_MAP.get(ctx.chainId)!)) / Math.pow(10, token.decimal)
            // console.log("tokenAum", tokenAum, WhitelistTokenMap[address].decimal, WhitelistTokenMap[address].symbol, ctx.timestamp)
            ctx.meter.Gauge("tokenAum").record(tokenAum, { coin_symbol: token.symbol })
            ctx.eventLogger.emit("tokenAum_log", {
                tokenAum,
                coin_symbol: token.symbol
            })
        } catch (e) { console.log(`gauge token aum error ${token.symbol} ${ctx.timestamp}`) }
    }
}

//gauge staked asset balance 
export const gaugeStakedAssets = async (_: any, ctx: FulContext) => {
    //record staked ful amount using ful.balanceOf(sFUL)
    try {
        const stakedFul = Number(await getERC20ContractOnContext(ctx, FUL_ADDRESS_MAP.get(ctx.chainId)!).balanceOf(sFUL_ADDRESS_MAP.get(ctx.chainId)!)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedFul").record(stakedFul)
        ctx.eventLogger.emit("stakedFul_log", {
            stakedFul,
            coin_symbol: "ful"
        })
    } catch (e) { console.log(`get staked ful amount error ${ctx.timestamp}`) }
    //record staked esFUL
    try {
        const stakedesFUL = Number(await getERC20ContractOnContext(ctx, esFUL_ADDRESS_MAP.get(ctx.chainId)!).balanceOf(sFUL_ADDRESS_MAP.get(ctx.chainId)!)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedesFUL").record(stakedesFUL)
    } catch (e) { console.log(`get staked esFul error ${ctx.timestamp}`) }
    //record vested esFUL in vFLP
    try {
        const vested_FLP = Number(await getERC20ContractOnContext(ctx, esFUL_ADDRESS_MAP.get(ctx.chainId)!).balanceOf(vFLP_ADDRESS_MAP.get(ctx.chainId)!)) / Math.pow(10, 18)
        ctx.meter.Gauge("vFLP").record(vested_FLP)
    } catch (e) { console.log(`get vested esFUL in vFLP error ${ctx.timestamp}`) }
    //record vested esFUL in vFUL
    try {
        const vested_FUL = Number(await getERC20ContractOnContext(ctx, esFUL_ADDRESS_MAP.get(ctx.chainId)!).balanceOf(vFUL_ADDRESS_MAP.get(ctx.chainId)!)) / Math.pow(10, 18)
        ctx.meter.Gauge("vFUL").record(vested_FUL)
    } catch (e) { console.log(`get vested esFUL in FUL error ${ctx.timestamp}`) }
}