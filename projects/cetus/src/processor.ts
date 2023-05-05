import { SuiNetwork } from "@sentio/sdk/sui"
import { pool, factory } from "./types/sui/testnet/clmm.js"
import { pool_script } from "./types/sui/testnet/integrate.js"
import { SuiObjectProcessor } from "@sentio/sdk/sui"

// factory.bind({ network: SuiNetwork.TEST_NET, startCheckpoint: BigInt(2602665) })
//   .onEventCreatePoolEvent((event, ctx) => {
//     ctx.meter.Counter("create_pool_counter").add(1)
//     const coin_type_a = event.data_decoded.coin_type_a
//     const coin_type_b = event.data_decoded.coin_type_b
//     const pool_id = event.data_decoded.pool_id
//     const tick_spacing = event.data_decoded.tick_spacing
//     ctx.eventLogger.emit("CreatePoolEvent", {
//       distinctId: ctx.transaction.sender,
//       pool_id,
//       coin_type_a,
//       coin_type_b,
//       tick_spacing
//     })
//   })

// export const INTEGRATE_ADDRESS = "0x641dabee5c95ad216ce54c7282e1a4ef36242d81c66431566f8efc6bdc2feda2"
// export const CLMM_ADDRESS = "0xf42bb3557dd14849e869e5668bcad98c6199aa9821a0c8aa12b04b42a3a7ee1e"


// pool.bind({ network: SuiNetwork.TEST_NET, startCheckpoint: BigInt(2602665) })
//   .onEventSwapEvent(async (event, ctx) => {
//     ctx.meter.Counter("swap_counter").add(1)
//     const pool = event.data_decoded.pool
//     const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
//     const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
//     const amount_in = Number(event.data_decoded.amount_in)
//     const amount_out = Number(event.data_decoded.amount_out)
//     const fee_amount = Number(event.data_decoded.fee_amount)
//     ctx.eventLogger.emit("SwapEvent", {
//       distinctId: ctx.transaction.sender,
//       pool,
//       before_sqrt_price,
//       after_sqrt_price,
//       amount_in,
//       amount_out,
//       fee_amount
//     })


//   })
// .onEventCollectRewardEvent(async (event, ctx) => {
//   ctx.meter.Counter("collect_reward_counter").add(1)
//   const position = event.data_decoded.position
//   const pool = event.data_decoded.pool
//   const amount = event.data_decoded.amount
//   ctx.eventLogger.emit("CollectRewardEvent", {
//     distinctId: ctx.transaction.sender,
//     position,
//     pool,
//     amount
//   })
// })






SuiObjectProcessor.bind({
  objectId: '0xc86f55bab28b7c390a2250da436adb7fae0906e9e6565ebf67490e361e0aba4d', network: SuiNetwork.TEST_NET,
}).onTimeInterval(async (self, _, ctx) => {
  console.log("1")
  console.log(self)
  const pool_info = await ctx.coder.decodedType(self, pool.Pool.type())

  const coin_a_balance = Number(pool_info?.coin_a)
  const coin_b_balance = Number(pool_info?.coin_b)
  if (coin_a_balance) { ctx.meter.Gauge('coin_a_balance').record(coin_a_balance) }
  else { console.log(JSON.stringify(pool_info), ctx.timestamp) }

  // ctx.meter.Gauge('coin_b_balance').record(coin_b_balance)

})