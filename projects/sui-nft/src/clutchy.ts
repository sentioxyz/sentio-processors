import { SuiNetwork } from "@sentio/sdk/sui";
import { orderbook } from "./types/sui/clutchy.js";
import { mint_event } from "./types/sui/mint.js";
import { listing } from "./types/sui/list.js";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { Mint, MintType, Trade } from "./model.js";
import { BigDecimal } from "@sentio/sdk";
import { getSeller, setSeller } from "./localdb.js";
export const CLUTCHY_ORDER = "0x4e0629fa51a62b0c1d7c7b9fc89237ec5b6f630d7798ad3f06d820afb93a995a"
export const CLUTCHY_MINT = "0xbc3df36be17f27ac98e3c839b2589db8475fa07b20657b08e8891e3aaf5ee5f9"
export const CLUTCHY_LIST = "0xc74531639fadfb02d30f05f37de4cf1e1149ed8d23658edd089004830068180b"

orderbook.bind({
      address: CLUTCHY_ORDER,
      network: SuiNetwork.MAIN_NET,
      startCheckpoint: 1500000n // TODO check
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
      const [nftName, _] = await getNftName(ctx, nft)

      ctx.meter.Gauge("order_filled_gauge").record(price, { coin_symbol: "SUI" })
      ctx.meter.Counter("order_filled_counter").add(price, { coin_symbol: "SUI" })

      ctx.eventLogger.emit("TradeOrderBook", {
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
      const collection_id = event.data_decoded.collection_id
      const object = event.data_decoded.object


      const mint: Mint = {
        evt_type: MintType.MINT,
        sender: ctx.transaction.transaction?.data.sender!,
        project: "clutchy",
        collection_name: "", // TODO
        collection_id: collection_id,
        object_id: object,
      }

      ctx.eventLogger.emit("Mint", { ...mint })
    })
    .onEventBurnEvent(async (event, ctx) => {
      ctx.meter.Counter("burn_counter").add(1, { project: "clutchy" })
      const collection_id = event.data_decoded.collection_id
      const object = event.data_decoded.object

      const mint: Mint = {
        evt_type: MintType.BURN,
        sender: ctx.transaction.transaction?.data.sender!,
        project: "clutchy",
        collection_name: "", // TODO
        collection_id: collection_id,
        object_id: object,
      }

      ctx.eventLogger.emit("Mint", {...mint})
    })


listing.bind({
      // address: CLUTCHY_LIST,
      // network: SuiNetwork.MAIN_NET,
      startCheckpoint: 1500000n // TODO check startCheckpoint
    })
    .onEventCreateListingEvent(async (event, ctx) => {
      await setSeller(event.data_decoded.listing_id, ctx.transaction.transaction?.data.sender || "")
    })
    // .onEventDeleteListingEvent(async (event, ctx) => {
    //   ctx.meter.Counter("delete_listing_counter").add(1, { project: "clutchy" })
    //   const listing_id = event.data_decoded.listing_id
    //   ctx.eventLogger.emit("Delist", {
    //     distinctId: ctx.transaction.transaction?.data.sender,
    //     listing_id,
    //     project: "clutchy"
    //   })
    // })
    .onEventNftSoldEvent(async (event, ctx) => {
      ctx.meter.Counter("nft_sold_counter").add(1, { project: "clutchy" })
      const nft_id = event.data_decoded.nft
      const price = event.data_decoded.price.scaleDown(9)
      const ft_type = event.data_decoded.ft_type
      const nft_type = event.data_decoded.nft_type
      const buyer = event.data_decoded.buyer
      const collectionName = getCollectionName(nft_type)
      const [nftName, _] = await getNftName(ctx, nft_id)

      const seller = await getSeller(nft_id)
      if (!seller) {
        console.warn("can't find seller", nft_id)
      }

      // TODO what is seler
      const trade: Trade = {
        project: "clutchy",
        collection_name: collectionName,
        nft_name: nftName,
        object_id: nft_id,
        nft_type,
        buyer,
        seller,
        amount: BigDecimal(1),
        price
      }

      if (!ft_type.endsWith("2::sui::SUI")) {
        console.error("DETECT NON sui SELL", ft_type, nft_id)
      }

      ctx.eventLogger.emit("Trade", { ...trade, ft_type })
    })