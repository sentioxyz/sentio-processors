import { tocen_marketplace } from './types/sui/tocen.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";

tocen_marketplace.bind()
  .onEventEventBuy(async (event, ctx) => {
    const [nft_name, nft_type, nft_link] = await getNftName(ctx, event.data_decoded.object_id)
    const collectionName = getCollectionName(nft_type)

    const trade: Trade = {
      project: "tocen",
      object_id: event.data_decoded.object_id,
      collection_name: collectionName,
      nft_name,
      nft_type,
      nft_link,
      buyer: event.data_decoded.sender,
      seller: event.data_decoded.receiver,
      amount: BigDecimal(1),
      price: event.data_decoded.paid.scaleDown(9) // TODO double check this
    }

    ctx.eventLogger.emit("Trade", {...trade })
  })