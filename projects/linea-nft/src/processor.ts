
import { EthChainId } from "@sentio/sdk/eth";
import { ZonicBasicOrderFulfilledEvent, ZonicContext, ZonicProcessor } from "./types/eth/zonic.js";
import { getOrCreateERC721, fetchTokenUri } from "./helper/nft-helper.js";
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

const ZONIC_CONTRACT_ADDR = "0x1a7b46c660603ebb5fbe3ae51e80ad21df00bdd1"

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


ZonicProcessor.bind({
  address: ZONIC_CONTRACT_ADDR,
  network: EthChainId.LINEA
})
  .onEventZonicBasicOrderFulfilled(orderFulfilledEventHandler)
