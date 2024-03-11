
import { kiosk_listings } from './types/sui/tradeport.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";

kiosk_listings.bind()
    .onEventBuyEvent(async (event, ctx) => {
      const [nftName, nft_type] = await getNftName(ctx, event.data_decoded.nft_id)
      const collectionName = getCollectionName(nft_type)

      const trade: Trade = {
        project: "tradeport",
        object_id: event.data_decoded.nft_id,
        collection_name: collectionName,
        nft_name: nftName,
        collection_id: "",
        nft_type: nft_type,
        buyer: event.data_decoded.buyer,
        seller: event.data_decoded.seller,
        amount: BigDecimal(1),
        price: event.data_decoded.price.scaleDown(9)
      }

      ctx.eventLogger.emit("Trade", { ...trade })
    })
