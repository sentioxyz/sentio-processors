import { token } from "@sentio/sdk/utils"
import { EthChainId } from "@sentio/sdk"
import { VaultContext } from "../types/eth/vault.js"
import { GlpManagerContext } from "../types/eth/glpmanager.js"
import { WhitelistTokenMap } from "./constant.js"
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

export async function buildTokenInfo(ctx: VaultContext | GlpManagerContext, tokenAddress: string): Promise<token.TokenInfo> {
    let tokenInfo: token.TokenInfo
    try {
        tokenInfo = await token.getERC20TokenInfo(ctx, tokenAddress)
        console.log(`build coin info ${tokenInfo.symbol} ${tokenInfo.decimal} ${tokenInfo.name}`)
        return tokenInfo
    } catch (e) {
        console.log("get token failed ", e.message, tokenAddress, ctx.chainId)
    }
    return {
        decimal: 100,
        symbol: "unk",
        name: "unk"
    }
}

export const getOrCreateToken = async function (ctx: VaultContext | GlpManagerContext, tokenAddress: string): Promise<token.TokenInfo> {
    let tokenInfo = coinInfoMap.get(tokenAddress)
    if (!tokenInfo) {
        tokenInfo = buildTokenInfo(ctx, tokenAddress)
        coinInfoMap.set(tokenAddress, tokenInfo)
        console.log("set coinInfoMap for " + tokenAddress)
    }
    return await tokenInfo
}

//gauge each asset in pool
export const gaugeTokenAum = async (_: any, ctx: VaultContext) => {
    for (let address in WhitelistTokenMap) {
        try {
            const tokenAum = Number(await getERC20ContractOnContext(ctx, address).balanceOf("0x489ee077994B6658eAfA855C308275EAd8097C4A")) / Math.pow(10, WhitelistTokenMap[address].decimal)
            console.log("tokenAum", tokenAum, WhitelistTokenMap[address].decimal, WhitelistTokenMap[address].symbol, ctx.timestamp)
            ctx.meter.Gauge("tokenAum").record(tokenAum, { coin_symbol: WhitelistTokenMap[address].symbol })
        } catch (e) { console.log(`error 4 ${WhitelistTokenMap[address].symbol} ${ctx.transactionHash}`) }
    }
}