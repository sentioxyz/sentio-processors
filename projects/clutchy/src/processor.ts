import { SuiNetwork } from "@sentio/sdk/sui";
import { orderbook } from "./types/sui/clutchy.js";
import { mint_event } from "./types/sui/mint.js";
import { getCollectionName, getNftName } from "./helper/nft-helper.js";
export const CLUTCHY_ORDER = "0x4e0629fa51a62b0c1d7c7b9fc89237ec5b6f630d7798ad3f06d820afb93a995a"
export const CLUTCHY_MINT = "0xbc3df36be17f27ac98e3c839b2589db8475fa07b20657b08e8891e3aaf5ee5f9"

orderbook.bind({
  address: CLUTCHY_ORDER,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventTradeFilledEvent(async (event, ctx) => {
    ctx.meter.Counter("order_filled_tx").add(1)

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

    ctx.meter.Gauge("order_filled_gauge").record(price, { coin_symbol: "SUI" })
    ctx.meter.Counter("order_filled_counter").add(price, { coin_symbol: "SUI" })

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
      message: `${nftName} order filled for ${price}, to ${buyer} from ${seller}`
    })
  })


mint_event.bind({
  address: CLUTCHY_MINT,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventMintEvent(async (event, ctx) => {
    ctx.meter.Counter("mint_counter").add(1)
    const collection_id = event.data_decoded.collection_id
    const object = event.data_decoded.object
    ctx.eventLogger.emit("MintEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      collection_id,
      object
    })
  })
  .onEventBurnEvent(async (event, ctx) => {
    ctx.meter.Counter("burn_counter").add(1)
    const collection_id = event.data_decoded.collection_id
    const object = event.data_decoded.object
    ctx.eventLogger.emit("BurnEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      collection_id,
      object
    })
  })