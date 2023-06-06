import { token } from "@sentio/sdk/utils"
import { EthChainId } from "@sentio/sdk"
import { VaultContext } from "../types/eth/vault.js"
import { GlpManagerContext } from "../types/eth/glpmanager.js"

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