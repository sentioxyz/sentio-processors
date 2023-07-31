import { clob_v2 } from "./types/sui/deepbook.js"
import { SuiContext } from "@sentio/sdk/sui"

const OrderFilledHandler = async (event: clob_v2.OrderFilledInstance, ctx: SuiContext) => {
    const maker_address = event.data_decoded.maker_address
    //movex
    if (maker_address == "0xff5bf4065dab5cf7f3ed0d92c43fa84d78e02f38a91f4bc4f4fbef03275cea81") {
        const sender = event.sender
        const type = event.type
        if (type == "0xdee9::clob_v2::OrderFilled<0x2::sui::SUI, 0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>") {
            const base_asset_quantity_filled = Number(event.data_decoded.base_asset_quantity_filled) / 10 ** 9
            const price = Number(event.data_decoded.price) / 10 ** 6

            ctx.eventLogger.emit("Swap", {
                distinctId: sender,
                base_asset_quantity_filled,
                price,
                project: "movex"
            })
        }
    }
}


clob_v2.bind()
    .onEventOrderFilled(OrderFilledHandler)

