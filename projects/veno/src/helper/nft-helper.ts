import { getERC721ContractOnContext } from '@sentio/sdk/eth/builtin/erc721'
import { VenostormContext } from '../types/eth/venostorm.js';

interface nftMetadata {
    name: string,
    symbol: string
}

let nftMetaDataMap = new Map<string, Promise<nftMetadata>>()

export async function buildNFTMetadata(ctx: VenostormContext, nftAddress: string): Promise<nftMetadata> {
    let [symbol, name] = ["undefine", "undefined"]

    try {
        name = await getERC721ContractOnContext(ctx, nftAddress).name()!
        symbol = await getERC721ContractOnContext(ctx, nftAddress).symbol()!
        console.log(`build nft metadata ${name}, ${symbol}`)
    }
    catch (e) {
        console.log(`${e.message} get nft metadata error ${nftAddress}`)
    }
    return {
        name,
        symbol
    }
}

export async function getOrCreateERC721(ctx: VenostormContext, nftAddress: string): Promise<nftMetadata> {
    let nftMetadata = nftMetaDataMap.get(nftAddress)
    if (!nftMetadata) {
        nftMetadata = buildNFTMetadata(ctx, nftAddress)
        nftMetaDataMap.set(nftAddress, nftMetadata)
        console.log("set metadata map for " + nftAddress)
    }
    return nftMetadata
}

