import { marketplace } from "./types/sui/bluemove.js";
import { bluemove_launchpad } from "./types/sui/blue-launchpad.js";
import { SuiNetwork } from "@sentio/sdk/sui";
import { getCollectionName, getNftName } from "./helper/nft-helper.js";

export const BLUEMOVE_MARKETPLACE = "0xd5dd28cc24009752905689b2ba2bf90bfc8de4549b9123f93519bb8ba9bf9981"
export const BLUEMOVE_LAUNCHPAD = "0x305fdc899f4d5d13a1e03ea784eed9bc5bdcb3e3550a32466ff34518aa4627a3"

marketplace.bind({
  address: BLUEMOVE_MARKETPLACE,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventListingEvent(async (event, ctx) => {
    ctx.meter.Counter("listing_counter").add(1, { vertical: "nft", project: "bluemove" })
    ctx.meter.Counter("total_tx").add(1, { vertical: "nft", project: "bluemove" })

    ctx.eventLogger.emit("Listing", {
      distinctId: event.data_decoded.seller,
      amount: Number(event.data_decoded.amount) / Math.pow(10, 9),
      item_id: event.data_decoded.item_id,
      nft_type: event.data_decoded.nft_type,
      vertical: "nft", project: "bluemove"
    })

  })
  .onEventDeListEvent(async (event, ctx) => {
    ctx.meter.Counter("delist_counter").add(1, { vertical: "nft", project: "bluemove" })
    ctx.meter.Counter("total_tx").add(1, { vertical: "nft", project: "bluemove" })
    ctx.eventLogger.emit("Delist", {
      distinctId: event.data_decoded.seller,
      item_id: event.data_decoded.item_id,
      nft_type: event.data_decoded.nft_type,
      vertical: "nft", project: "bluemove"
    })
  })
  .onEventBuyEvent(async (event, ctx) => {
    ctx.meter.Counter("order_filled_tx").add(1, { vertical: "nft", project: "bluemove" })
    ctx.meter.Counter("total_tx").add(1, { vertical: "nft", project: "bluemove" })
    const item_id = event.data_decoded.item_id
    const price = Number(event.data_decoded.amount) / Math.pow(10, 9)
    const buyer = event.data_decoded.buyer
    const nft_type = event.data_decoded.nft_type
    const collectionName = getCollectionName(nft_type)
    const nftName = await getNftName(ctx, item_id)
    ctx.eventLogger.emit("OrderFilled", {
      distinctId: buyer,
      item_id,
      nft_type,
      price,
      collectionName,
      nftName,
      coin_symbol: "SUI",
      vertical: "nft", project: "bluemove",
      message: `buy ${nftName} ${collectionName} for ${price}, to ${buyer}`
    })


    ctx.meter.Gauge("order_filled_gauge").record(price, { coin_symbol: "SUI", vertical: "nft", project: "bluemove" })
    ctx.meter.Counter("order_filled_counter").add(price, { coin_symbol: "SUI", vertical: "nft", project: "bluemove" })


  })


bluemove_launchpad.bind({
  address: BLUEMOVE_LAUNCHPAD,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventMintNFTEvent(async (event, ctx) => {
    ctx.meter.Counter("mint_counter").add(1, { vertical: "nft", project: "bluemove" })
    ctx.meter.Counter("total_tx").add(1, { vertical: "nft", project: "bluemove" })
    const name = event.data_decoded.name
    const object_id = event.data_decoded.object_id
    ctx.eventLogger.emit("MintEvent", {
      distinctId: event.data_decoded.creator,
      name,
      object_id,
      vertical: "nft", project: "bluemove"
    })
  })
  .onEventBurnEvent(async (event, ctx) => {
    ctx.meter.Counter("burn_counter").add(1)
    ctx.meter.Counter("total_tx").add(1, { vertical: "nft", project: "bluemove" })
    const nft_name = event.data_decoded.nft_name
    const object_id = event.data_decoded.object_id
    ctx.eventLogger.emit("BurnEvent", {
      distinctId: event.data_decoded.sender,
      nft_name,
      object_id,
      vertical: "nft", project: "bluemove"
    })
  })