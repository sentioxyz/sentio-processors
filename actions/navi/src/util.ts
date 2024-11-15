import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'

export interface TokenInfo {
    symbol: string
    name: string
    decimal: number
}


const client = new SuiClient({ url: getFullnodeUrl('mainnet') })

let coinInfoMap = new Map<string, Promise<TokenInfo>>()

export async function getOrCreateCoin(coinAddress: string): Promise<TokenInfo> {
    let coinInfo = coinInfoMap.get(coinAddress)
    if (!coinInfo) {
        coinInfo = buildCoinInfo(coinAddress)
        coinInfoMap.set(coinAddress, coinInfo)
        console.log("set coinInfoMap for " + coinAddress)
    }
    return coinInfo
}

export async function buildCoinInfo(coinAddress: string): Promise<TokenInfo> {
    const metadata = await client.getCoinMetadata({ coinType: coinAddress })
    //@ts-ignore
    const symbol = metadata.symbol
    //@ts-ignore
    const decimal = metadata.decimals
    //@ts-ignore
    const name = metadata.name
    console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
    return {
        symbol,
        name,
        decimal
    }
}