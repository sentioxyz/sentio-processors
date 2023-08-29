import { ERC721Processor } from "@sentio/sdk/eth/builtin";
import { getERC721Contract } from '@sentio/sdk/eth/builtin/erc721'
import { EthChainId } from "@sentio/sdk/eth";
import { NFT_COLLECTIONS } from "./helper/constant.js";
import { ZonicBasicOrderFulfilledEvent, ZonicContext, ZonicProcessor } from "./types/eth/zonic.js";

interface nftMetadata {
  name: string,
  symbol: string
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

interface ERC721Metadata {
  name: string,
  description: string,
  image: string,
  attributes: string
}


const orderFulfilledEventHandler = async (event: ZonicBasicOrderFulfilledEvent, ctx: ZonicContext) => {
  const token = event.args.token.toLowerCase()
  const nftMetadata = await getOrCreateERC721(token)
  const tokenId = Number(event.args.identifier)
  let fetchedMetadata: ERC721Metadata
  let tokenUri
  [fetchedMetadata, tokenUri] = await fetchTokenUri(token, tokenId)

  ctx.eventLogger.emit("ZonicBasicOrderFulfulled", {
    distinctId: event.args.buyer.toLowerCase(),
    offerer: event.args.offerer.toLowerCase(),
    token,
    identifier: tokenId,
    name: nftMetadata.name,
    symbol: nftMetadata.symbol,
    currency: event.args.currency.toLowerCase(),
    totalPrice: Number(event.args.totalPrice) / 10 ** 18,
    creatorFee: Number(event.args.creatorFee) / 10 ** 18,
    marketplaceFee: Number(event.args.marketplaceFee) / 10 ** 18,
    saleId: event.args.saleId.toLowerCase(),
    tokenUri,
    normalized_metadata_token_name: fetchedMetadata.name,
    normalized_metadata_token_description: fetchedMetadata.description,
    normalized_metadata_token_image: fetchedMetadata.image,
    normalized_metadata_token_attributes: JSON.stringify(fetchedMetadata.attributes)
  })
}

const ZONIC_CONTRACT_ADDR = "0x1a7b46c660603ebb5fbe3ae51e80ad21df00bdd1"

ZonicProcessor.bind({
  address: ZONIC_CONTRACT_ADDR,
  network: EthChainId.LINEA
})
  .onEventZonicBasicOrderFulfilled(orderFulfilledEventHandler)
  










NFT_COLLECTIONS.forEach(address => {
  ERC721Processor.bind({
    address: address,
    network: EthChainId.LINEA
  })
    .onEventTransfer(async (event, ctx) => {
      const txHash = event.transactionHash
      const tokenId = Number(event.args.tokenId)

      const nftMetadata = await getOrCreateERC721(address)

      let fetchedMetadata: ERC721Metadata
      let tokenUri
      [fetchedMetadata, tokenUri] = await fetchTokenUri(address, tokenId)

      const from = event.args.from.toLowerCase()
      const to = event.args.to.toLowerCase()
      ctx.eventLogger.emit("Transfer", {
        distinctId: (from == "0x0000000000000000000000000000000000000000") ? to : from,
        from,
        to,
        name: nftMetadata.name,
        symbol: nftMetadata.symbol,
        tokenId,
        tokenUri,
        normalized_metadata_token_name: fetchedMetadata.name,
        normalized_metadata_token_description: fetchedMetadata.description,
        normalized_metadata_token_image: fetchedMetadata.image,
        normalized_metadata_token_attributes: JSON.stringify(fetchedMetadata.attributes),
        message: `Transfer from ${from} to ${to}`
      })
    })
})