import { hyperspace } from './types/sui/hyperspace.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";

hyperspace.bind()
  .onEventItemPurchased(async (event, ctx) => {

    const [nftName, nft_type] = await getNftName(ctx, event.data_decoded.id)
    const collectionName = getCollectionName(nft_type)

    const trade: Trade = {
      project: "hyperspace",
      object_id: event.data_decoded.id,
      collection_name: collectionName,
      nft_name: nftName,
      nft_type: nft_type,
      buyer: "",
      seller: "",
      amount: BigDecimal(1),
      price: event.data_decoded.price.scaleDown(9)
    }

    ctx.eventLogger.emit("Trade", {...trade })
  })