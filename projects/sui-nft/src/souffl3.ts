import { Market } from './types/sui/souffl3.js'
import { getCollectionName, getNftName } from "./nft-helper.js";
import { Trade } from "./model.js";
import { BigDecimal } from "@sentio/sdk";

Market.bind()
  .onEventBuyEvent(async (event, ctx) => {
    const [nft_name, nft_type, nft_link] = await getNftName(ctx, event.data_decoded.nft_id)
    const collectionName = getCollectionName(nft_type)

    const trade: Trade = {
      project: "souffl3",
      object_id: event.data_decoded.nft_id,
      collection_name: collectionName,
      nft_name,
      nft_type,
      nft_link,
      buyer: event.data_decoded.buyer,
      seller: event.data_decoded.seller,
      amount: BigDecimal(1),
      price: event.data_decoded.price.scaleDown(9)
    }

    ctx.eventLogger.emit("Trade", {...trade })
  })