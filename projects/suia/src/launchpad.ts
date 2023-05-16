import { pool } from "./types/sui/launchpad.js"
import * as helper from './helper/clmm-helper.js'
import { getPoolMetadata } from "./helper/launchpad-helper.js"
import { SuiChainId } from "@sentio/sdk"
export const CETUS_LAUNCHPAD = "0x80d114c5d474eabc2eb2fcd1a0903f1eb5b5096a8dc4184d72453f7a9be728e4"
export const SUIA_SUI_POOL = "0x2e5778db3fc68f928cfb36f9d2a0f588a19753db20760312615d2ee52bfa4185"
export const SUIA_CETUS_POOL = "0x1b7934e4b822a440e4192e3185486efea9e84e3698cb5d6f5931ef0951180c81"

pool.bind({
    address: CETUS_LAUNCHPAD,
    network: SuiChainId.SUI_MAINNET,
    startCheckpoint: 2000000n
})
    .onEventPurchaseEvent(async (event, ctx) => {
        const pool_id = event.data_decoded.pool_id.toLowerCase()
        if (pool_id == SUIA_SUI_POOL || pool_id == SUIA_CETUS_POOL) {
            const poolInfo = await helper.getOrCreatePool(ctx, pool_id)
            const pairName = poolInfo.symbol_a + "-" + poolInfo.symbol_b
            //raise coin amount
            const amount = Number(event.data_decoded.amount) / Math.pow(10, poolInfo.decimal_b)
            ctx.meter.Counter("purchase_tx_counter").add(1, { pairName })
            ctx.meter.Gauge("purchase_amt_gauge").record(amount, { pairName })

            const metadata = await getPoolMetadata(ctx, pool_id)
            const softcap = metadata.softcap / Math.pow(10, poolInfo.decimal_b)
            const hardcap = metadata.hardcap / Math.pow(10, poolInfo.decimal_b)
            const reality_raise_total = metadata.reality_raise_total / Math.pow(10, poolInfo.decimal_b)
            const sale_total = metadata.sale_total / Math.pow(10, poolInfo.decimal_a)

            ctx.eventLogger.emit("PurchaseEvent", {
                distinctId: ctx.transaction.transaction.data.sender,
                pool_id,
                amount,
                softcap,
                hardcap,
                reality_raise_total,
                sale_total,
                coin_symbol: poolInfo.symbol_b, //to calculate usd vol
                pairName,
                message: `Purchased ${amount} ${poolInfo.symbol_b}`
            })
        }
    })

