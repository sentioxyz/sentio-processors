import { AptosNetwork } from "@sentio/sdk/aptos"
import { lending } from "./types/aptos/movement-porto/0x3dc5ef372359b6ab006bb517a8df5ca1b2c8ef35ce1ff45f7db8a44e2e43e856.js"

lending
lending.bind({
    network: AptosNetwork.MOVEMENT_TEST_NET
})
    .onEventBorrowEvent(async (event, ctx) => {
        const market = event.data_decoded.market_obj
        const amount = event.data_decoded.amount
        ctx.eventLogger.emit("Borrow", {
            market,
            amount,
            key: "value"
        })

        ctx.meter.Counter("borrowCounter").add(1, { market })
    })
    .onEventCreateMarketEvent(async (event, ctx) => {
        const market = event.data_decoded.market_obj
        ctx.meter.Counter("createMarketCounter").add(1, { market })

    })