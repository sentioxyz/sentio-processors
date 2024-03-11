import { keepsake_marketplace } from './types/sui/keepsake.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";
import { getSeller, setSeller } from "./localdb.js";

keepsake_marketplace.bind()
    .onEventListItemEvent(async (event, ctx) => {
      await setSeller(event.data_decoded.item_id, ctx.transaction.transaction?.data.sender || "")
    })
    .onEventDelistItemEvent(async (event, ctx) => {
      if (!event.data_decoded.sold) {
        return // not sold
      }
      const [nft_name, nft_type, nft_link] = await getNftName(ctx, event.data_decoded.item_id)
      const collectionName = getCollectionName(nft_type)

      const seller = await getSeller(event.data_decoded.item_id)

      const trade: Trade = {
        project: "keepsake",
        object_id: event.data_decoded.item_id,
        collection_name: collectionName,
        nft_name,
        nft_type,
        nft_link,
        buyer: ctx.transaction.transaction?.data.sender || "",
        seller,
        amount: BigDecimal(1),
        price: event.data_decoded.sale_price.scaleDown(9)
      }

      ctx.eventLogger.emit("Trade", {...trade })
    })