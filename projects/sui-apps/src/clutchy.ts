import { SuiNetwork } from "@sentio/sdk/sui";
import { orderbook } from "./types/sui/clutchy.js";
import { mint_event } from "./types/sui/mint.js";
import { listing } from "./types/sui/list.js";
import { getCollectionName, getNftName } from "./helper/nft-helper.js";
export const CLUTCHY_ORDER = "0x4e0629fa51a62b0c1d7c7b9fc89237ec5b6f630d7798ad3f06d820afb93a995a"
export const CLUTCHY_MINT = "0xbc3df36be17f27ac98e3c839b2589db8475fa07b20657b08e8891e3aaf5ee5f9"
export const CLUTCHY_LIST = "0xc74531639fadfb02d30f05f37de4cf1e1149ed8d23658edd089004830068180b"

orderbook.bind({
  address: CLUTCHY_ORDER,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventTradeFilledEvent(async (event, ctx) => {
    ctx.meter.Counter("order_filled_tx").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const buyer_kiosk = event.data_decoded.buyer_kiosk
    const buyer = event.data_decoded.buyer
    const nft = event.data_decoded.nft
    const orderbook = event.data_decoded.orderbook
    const price = Number(event.data_decoded.price) / Math.pow(10, 9)
    const seller_kiosk = event.data_decoded.seller_kiosk
    const seller = event.data_decoded.seller
    const trade_intermediate = event.data_decoded.trade_intermediate
    const nft_type = event.data_decoded.nft_type
    const ft_type = event.data_decoded.ft_type
    const collectionName = getCollectionName(nft_type)
    const nftName = await getNftName(ctx, nft)

    ctx.meter.Gauge("order_filled_gauge").record(price, { coin_symbol: "SUI", project: "clutchy" })
    ctx.meter.Counter("order_filled_counter").add(price, { coin_symbol: "SUI", project: "clutchy" })

    ctx.eventLogger.emit("OrderFilled", {
      distinctId: buyer,
      buyer_kiosk,
      nft,
      orderbook,
      price,
      seller_kiosk,
      seller,
      trade_intermediate,
      nft_type,
      collectionName,
      ft_type,
      nftName,
      coin_symbol: "SUI",
      project: "clutchy",
      message: `${nftName} order filled for ${price}, to ${buyer} from ${seller}`
    })
  })


mint_event.bind({
  address: CLUTCHY_MINT,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventMintEvent(async (event, ctx) => {
    ctx.meter.Counter("mint_counter").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const collection_id = event.data_decoded.collection_id
    const object = event.data_decoded.object
    ctx.eventLogger.emit("MintEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      collection_id,
      object,
      project: "clutchy"
    })
  })
  .onEventBurnEvent(async (event, ctx) => {
    ctx.meter.Counter("burn_counter").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const collection_id = event.data_decoded.collection_id
    const object = event.data_decoded.object
    ctx.eventLogger.emit("BurnEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      collection_id,
      object,
      project: "clutchy"
    })
  })


listing.bind({
  address: CLUTCHY_LIST,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventCreateListingEvent(async (event, ctx) => {
    ctx.meter.Counter("create_listing_counter").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const listing_id = event.data_decoded.listing_id
    ctx.eventLogger.emit("CreateListing", {
      distinctId: ctx.transaction.transaction.data.sender,
      listing_id,
      project: "clutchy"
    })
  })
  .onEventDeleteListingEvent(async (event, ctx) => {
    ctx.meter.Counter("delete_listing_counter").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const listing_id = event.data_decoded.listing_id
    ctx.eventLogger.emit("DeleteListing", {
      distinctId: ctx.transaction.transaction.data.sender,
      listing_id,
      project: "clutchy"
    })
  })
  .onEventNftSoldEvent(async (event, ctx) => {
    ctx.meter.Counter("nft_sold_counter").add(1, { project: "clutchy" })
    ctx.meter.Counter("total_tx").add(1, { project: "clutchy" })

    const nft = event.data_decoded.nft
    const price = Number(event.data_decoded.price) / Math.pow(10, 9)
    const ft_type = event.data_decoded.ft_type
    const nft_type = event.data_decoded.nft_type
    const buyer = event.data_decoded.buyer
    const collectionName = getCollectionName(nft_type)
    const nftName = await getNftName(ctx, nft)

    ctx.eventLogger.emit("NftSold", {
      distinctId: buyer,
      nft,
      price,
      ft_type,
      nft_type,
      collectionName,
      nftName,
      project: "clutchy",
      message: `${nftName} ${collectionName} sold for ${price}, to ${buyer}`
    })
  })