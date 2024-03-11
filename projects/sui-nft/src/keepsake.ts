import { keepsake_marketplace } from './types/sui/keepsake.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";

keepsake_marketplace.bind()
    .onEventDelistItemEvent(async (event, ctx) => {
      if (!event.data_decoded.sold) {
        return // not sold
      }
      const [nftName, nft_type] = await getNftName(ctx, event.data_decoded.item_id)
      const collectionName = getCollectionName(nft_type)

      const trade: Trade = {
        project: "keepsake",
        object_id: event.data_decoded.item_id,
        collection_name: collectionName,
        nft_name: nftName,
        nft_type: nft_type,
        buyer: "", // TODO
        seller: "", // TODO
        amount: BigDecimal(1),
        price: event.data_decoded.sale_price.scaleDown(9)
      }

      ctx.eventLogger.emit("Trade", {...trade })
    })