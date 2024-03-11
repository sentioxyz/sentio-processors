import { marketplace } from "./types/sui/bluemove.js";
import { bluemove_launchpad } from "./types/sui/bluemove_launchpad.js";
import { SuiNetwork } from "@sentio/sdk/sui";
import { getCollectionName, getNftName } from "./nft-helper.js";
import { Mint, MintType, Trade } from "./model.js";
import { BigDecimal } from "@sentio/sdk";
import { getSeller, setSeller } from "./localdb.js";

// export const BLUEMOVE_MARKETPLACE = "0xd5dd28cc24009752905689b2ba2bf90bfc8de4549b9123f93519bb8ba9bf9981"
// export const BLUEMOVE_LAUNCHPAD = "0x305fdc899f4d5d13a1e03ea784eed9bc5bdcb3e3550a32466ff34518aa4627a3"


marketplace.bind({
      // address: BLUEMOVE_MARKETPLACE,
      // network: SuiNetwork.MAIN_NET,
      startCheckpoint: 1500000n
    })
    .onEventListingEvent(async (event, ctx) => {
      await setSeller(event.data_decoded.item_id, event.data_decoded.seller)
    })
    // .onEventDeListEvent(async (event, ctx) => {
    //   ctx.meter.Counter("delist_counter").add(1, { project: "bluemove" })
    //   ctx.eventLogger.emit("Delist", {
    //     distinctId: event.data_decoded.seller,
    //     item_id: event.data_decoded.item_id,
    //     nft_type: event.data_decoded.nft_type,
    //     project: "bluemove"
    //   })
    // })
    .onEventBuyEvent(async (event, ctx) => {
      ctx.meter.Counter("buy_counter").add(1, { project: "bluemove" })
      const item_id = event.data_decoded.item_id
      const amount = event.data_decoded.amount.scaleDown(9)
      const buyer = event.data_decoded.buyer
      const nft_type = event.data_decoded.nft_type
      const collectionName = getCollectionName(nft_type)
      const [nftName, _] = await getNftName(ctx, item_id)

      const seller = await getSeller(item_id)

      // TODO what is ft_type
      // TODO what is seler
      const trade: Trade = {
        project: "bluemove",
        collection_name: collectionName,
        nft_name: nftName,
        collection_id: "",
        object_id: item_id,
        nft_type,
        buyer,
        seller,
        amount: amount,
        price: BigDecimal(0)
      }

      ctx.eventLogger.emit("Trade", { ...trade })

      //
      // ctx.eventLogger.emit("Trade", {
      //   distinctId: buyer,
      //   item_id,
      //   nft_type,
      //   amount,
      //   collectionName,
      //   nftName,
      //   coin_symbol: "SUI",
      //   project: "bluemove",
      //   message: `buy ${nftName} ${collectionName} for ${amount}, to ${buyer}`
      // })

      ctx.meter.Gauge("order_filled_gauge").record(amount, { coin_symbol: "SUI", project: "bluemove" })
      ctx.meter.Counter("order_filled_counter").add(amount, { coin_symbol: "SUI", project: "bluemove" })
    })


bluemove_launchpad.bind({
      // address: BLUEMOVE_LAUNCHPAD,
      // network: SuiNetwork.MAIN_NET,
      startCheckpoint: 1500000n
    })
    .onEventMintNFTEvent(async (event, ctx) => {
      ctx.meter.Counter("mint_counter").add(1, { project: "bluemove" })
      const name = event.data_decoded.name
      const object_id = event.data_decoded.object_id

      const mint: Mint = {
        evt_type: MintType.MINT,
        sender: event.data_decoded.creator,
        project: "bluemove",
        collection_name: name,
        collection_id: "", // TODO
        object_id,
      }
      ctx.eventLogger.emit("Mint", { ...mint })
    })
    .onEventBurnEvent(async (event, ctx) => {
      ctx.meter.Counter("burn_counter").add(1)
      const nft_name = event.data_decoded.nft_name
      const object_id = event.data_decoded.object_id

      const burn: Mint = {
        evt_type: MintType.BURN,
        sender: event.data_decoded.sender,
        project: "bluemove",
        collection_name: nft_name,
        collection_id: "",
        object_id,
      }

      ctx.eventLogger.emit("Mint", { ...burn })
    })