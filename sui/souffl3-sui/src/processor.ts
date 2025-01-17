import { Market } from "./types/sui/souffl3-market.js";
// import { port } from "./types/sui/souffl3-launchpad.js";
import { SuiNetwork } from "@sentio/sdk/sui";
import { getNftAndCollectionName } from "./helper/nft-helper.js";

export const SOUFFL3_MARKETPLACE = "0x3164fcf73eb6b41ff3d2129346141bd68469964c2d95a5b1533e8d16e6ea6e13"
export const SOUFFL3_LAUNCHPAD = "0x42de05b8e76db21ee6fe0a1f631d7bb3ea9076241cdc78a8960c0353103fde28"

Market.bind({
  address: SOUFFL3_MARKETPLACE,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventBuyEvent(async (event, ctx) => {
    ctx.meter.Counter("buy_counter").add(1, { project: "souffl3" })
    const listing_id = event.data_decoded.listing_id
    const price = Number(event.data_decoded.price) / Math.pow(10, 9)
    const buyer = event.data_decoded.buyer
    const seller = event.data_decoded.seller
    const nft_id = event.data_decoded.nft_id
    const marketplace = event.data_decoded.marketplace

    const [nftName, collectionName] = await getNftAndCollectionName(ctx, nft_id)


    ctx.eventLogger.emit("Buy", {
      distinctId: buyer,
      listing_id,
      nft_id,
      price,
      seller,
      collectionName,
      nftName,
      marketplace,
      coin_symbol: "SUI",
      project: "souffl3",
      message: `buy ${nftName} ${collectionName} for ${price}, to ${buyer} from ${seller}`
    })


    ctx.meter.Gauge("order_filled_gauge").record(price, { coin_symbol: "SUI", project: "souffl3" })
    ctx.meter.Counter("order_filled_counter").add(price, { coin_symbol: "SUI", project: "souffl3" })
  })
  .onEventListEvent(async (event, ctx) => {
    ctx.meter.Counter("listing_counter").add(1, { project: "souffl3" })
    ctx.eventLogger.emit("Listing", {
      distinctId: event.data_decoded.seller,
      price: Number(event.data_decoded.price) / Math.pow(10, 9),
      listing_id: event.data_decoded.listing_id,
      nft_id: event.data_decoded.nft_id,
      marketplace: event.data_decoded.marketplace,
      does_royalty: event.data_decoded.does_royalty,
      project: "souffl3"
    })

  })
  .onEventDelistEvent(async (event, ctx) => {
    ctx.meter.Counter("delist_counter").add(1, { project: "bluemove" })
    ctx.eventLogger.emit("Delist", {
      distinctId: event.data_decoded.seller,
      listing_id: event.data_decoded.listing_id,
      nft_id: event.data_decoded.nft_id,
      marketplace: event.data_decoded.marketplace,
      project: "souffl3"
    })
  })


// port.bind({
//   address: SOUFFL3_LAUNCHPAD,
//   network: SuiNetwork.MAIN_NET,
//   startCheckpoint: 1500000n
// })
