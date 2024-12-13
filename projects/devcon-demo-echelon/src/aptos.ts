import { lending } from "./types/aptos/0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba.js";

lending.bind()
    .onEventBorrowEvent(async (event, ctx) => {
        const market = event.data_decoded.market_obj.inner

        ctx.eventLogger.emit("Borrow", {
            market,
            key: "value"
        })

        ctx.meter.Counter("borrowCounter").add(1, { market })
    })
    .onEventCreateMarketEvent(async (event, ctx) => {
        const market = event.data_decoded.market_obj.inner

        ctx.eventLogger.emit("CreateMarket", {
            market,
            key: "value"
        })

        ctx.meter.Counter("createMarketCounter").add(1, { market })

    })