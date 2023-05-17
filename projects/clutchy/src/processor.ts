import { SuiNetwork } from "@sentio/sdk/sui";
import { orderbook } from "./types/sui/clutchy.js";

orderbook.bind({
  address: "0x4e0629fa51a62b0c1d7c7b9fc89237ec5b6f630d7798ad3f06d820afb93a995a",
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventTradeFilledEvent(async (event, ctx) => {
    ctx.meter.Counter("OrderFilled").add(1)

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
      ft_type
    })
  })
