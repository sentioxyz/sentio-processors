// import { pool } from "./types/sui/launchpad.js"
// import * as constant from './constant-cetus.js'
// import * as helper from './helper/cetus-clmm.js'
// import { getIDOPoolMetadata } from "./helper/cetus-launchpad.js"
// import { SuiNetwork } from "@sentio/sdk/sui"

// pool.bind({
//     address: constant.LAUNCHPAD_MAINNET,
//     network: SuiNetwork.MAIN_NET,
//     startCheckpoint: 1500000n
// })
//     .onEventPurchaseEvent(async (event, ctx) => {
//         const pool_id = event.data_decoded.pool_id
//         const poolInfo = await helper.getOrCreatIDOPool(ctx, pool_id)
//         const pairName = poolInfo.pairName
//         //sui amount
//         const amount = Number(event.data_decoded.amount) / Math.pow(10, poolInfo.decimal_b)
//         ctx.meter.Counter("purchase_tx_counter").add(1, { pairName })
//         ctx.meter.Gauge("purchase_amt_gauge").record(amount, { pairName })

//         const metadata = await getIDOPoolMetadata(ctx, pool_id)
//         const softcap = metadata.softcap / Math.pow(10, poolInfo.decimal_b)
//         const hardcap = metadata.hardcap / Math.pow(10, poolInfo.decimal_b)
//         const reality_raise_total = metadata.reality_raise_total / Math.pow(10, poolInfo.decimal_b)
//         const sale_total = metadata.sale_total / Math.pow(10, poolInfo.decimal_a)

//         ctx.eventLogger.emit("PurchaseEvent", {
//             //@ts-ignore
//             distinctId: ctx.transaction.transaction.data.sender,
//             pool_id,
//             amount,
//             softcap,
//             hardcap,
//             reality_raise_total,
//             sale_total,
//             coin_symbol: poolInfo.symbol_b, //to calculate usd vol
//             pairName,
//             message: `Purchased ${amount} ${poolInfo.symbol_b}`
//         })
//     })

