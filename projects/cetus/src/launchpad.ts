import { pool } from "./types/sui/launchpad.js"
import * as constant from './constant.js'
import * as helper from './helper.js'
import { SuiChainId } from "@sentio/sdk"

pool.bind({
    address: constant.LAUNCHPAD_MAINNET,
    network: SuiChainId.SUI_MAINNET,
    startCheckpoint: BigInt(1500000)
})
    .onEventPurchaseEvent(async (event, ctx) => {
        const pool_id = event.data_decoded.pool_id
        const poolInfo = await helper.getOrCreatePool(ctx, pool_id)
        const pairName = poolInfo.pairName
        //sui amount
        const amount = Number(event.data_decoded.amount) / Math.pow(10, 9)
        ctx.meter.Gauge("PurchaseEvent").record(amount, { pairName })
        ctx.eventLogger.emit("CreatePoolEvent", {
            distinctId: ctx.transaction.transaction.data.sender,
            pool_id,
            amount,
            coin_symbol: "SUI",
            pairName
        })
    })
