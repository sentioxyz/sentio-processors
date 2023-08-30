import { ERC721Processor } from "@sentio/sdk/eth/builtin";
import { getERC721Contract } from '@sentio/sdk/eth/builtin/erc721'
import { EthChainId } from "@sentio/sdk/eth";

interface nftMetadata {
    name: string,
    symbol: string
}
interface ERC721Metadata {
    name: string,
    description: string,
    image: string,
    attributes: string
}

let nftMetaDataMap = new Map<string, Promise<nftMetadata>>()

export async function buildNFTMetadata(nftAddress: string): Promise<nftMetadata> {
    let [symbol, name] = ["undefine", "undefined"]

    try {
        name = await getERC721Contract(EthChainId.LINEA, nftAddress).name()!
        symbol = await getERC721Contract(EthChainId.LINEA, nftAddress).symbol()!
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

export async function getOrCreateERC721(nftAddress: string): Promise<nftMetadata> {
    let nftMetadata = nftMetaDataMap.get(nftAddress)
    if (!nftMetadata) {
        nftMetadata = buildNFTMetadata(nftAddress)
        nftMetaDataMap.set(nftAddress, nftMetadata)
        console.log("set metadata map for " + nftAddress)
    }
    return nftMetadata
}

export async function fetchTokenUri(nftAddress: string, tokenId: number) {
    let fetchedMetadata
    let tokenUri
    try {
        tokenUri = await getERC721Contract(EthChainId.LINEA, nftAddress).tokenURI(tokenId)!
        if (tokenUri.slice(0, 4) == "ipfs") {
            tokenUri = "https://ipfs.io/ipfs/" + tokenUri.substring(7,)
        }
        const data = await fetch(tokenUri)
        fetchedMetadata = await data.json()
        console.log("ERC721 uri: ", fetchedMetadata, " from ", nftAddress, " tokenId ", tokenId)
    }
    catch (e) {
        if (e instanceof Error) {
            console.log(e.message, " retrieve erc721 uri failed. uri: ", tokenUri, nftAddress, tokenId)
            return "unknown uri"
        }
    }
    return [fetchedMetadata, tokenUri]
}


