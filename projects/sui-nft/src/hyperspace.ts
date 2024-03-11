import { hyperspace } from './types/sui/hyperspace.js'
import { Trade } from "./model.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { BigDecimal } from "@sentio/sdk";
import { getSeller, setSeller } from "./localdb.js";

hyperspace.bind()
  .onEventItemListed(async (event, ctx) => {
    await setSeller(event.data_decoded.id, ctx.transaction.transaction?.data.sender || "")
  })
  .onEventItemPurchased(async (event, ctx) => {

    const [nftName, nft_type] = await getNftName(ctx, event.data_decoded.id)
    const collectionName = getCollectionName(nft_type)
    const seller = await getSeller(event.data_decoded.id)

    const trade: Trade = {
      project: "hyperspace",
      object_id: event.data_decoded.id,
      collection_name: collectionName,
      nft_name: nftName,
      nft_type: nft_type,
      buyer: ctx.transaction.transaction?.data.sender || "",
      seller,
      amount: BigDecimal(1),
      price: event.data_decoded.price.scaleDown(9)
    }

    ctx.eventLogger.emit("Trade", {...trade })
  })