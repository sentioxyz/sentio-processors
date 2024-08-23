// import { getOrCreateCoin } from "./helper/cetus-clmm.js"
// import { pool } from "./types/sui/0x11ea791d82b5742cc8cab0bf7946035c97d9001d7c3803a93f119753da66f526.js"
// pool.bind({
// })
//     .onEventHarvestEvent(async (event, ctx) => {
//         const rewardToken = "0x" + event.data_decoded.rewarder_type.name
//         const tokenInfo = await getOrCreateCoin(ctx, rewardToken)
//         ctx.eventLogger.emit("HarvestEvent", {
//             distinctId: event.sender,
//             pool_id: event.data_decoded.pool_id,
//             wrapped_position_id: event.data_decoded.wrapped_position_id,
//             clmm_pool_id: event.data_decoded.clmm_pool_id,
//             clmm_position_id: event.data_decoded.clmm_position_id,
//             rewarder_type: event.data_decoded.rewarder_type.name,
//             amount: Number(event.data_decoded.amount) / 10 ** tokenInfo.decimal,
//             coin_symbol: tokenInfo.symbol
//         })
//     })