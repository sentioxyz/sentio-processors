import { SuiNetwork } from "@sentio/sdk/sui"
import { pool, factory } from "./types/sui/testnet/clmm.js"
import { pool_script } from "./types/sui/testnet/integrate.js"

// factory.bind({  network: SuiNetwork.TEST_NET })
//   .onEventCreatePoolEvent((event, ctx) => {
//     ctx.meter.Counter("create_pool_counter").add(1)

//   })

export const INTEGRATE_ADDRESS = "0x641dabee5c95ad216ce54c7282e1a4ef36242d81c66431566f8efc6bdc2feda2"
export const CLMM_ADDRESS = "0xf42bb3557dd14849e869e5668bcad98c6199aa9821a0c8aa12b04b42a3a7ee1e"


pool.bind({ network: SuiNetwork.TEST_NET, startCheckpoint: BigInt(2602665) })
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1)
    // const pool = event.data_decoded.pool
    // const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
    // const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
    // const amount_in = Number(event.data_decoded.amount_in)
    // const amount_out = Number(event.data_decoded.amount_out)
    // const fee_amount = Number(event.data_decoded.fee_amount)
    // ctx.eventLogger.emit("SwapEvent", {
    //   distinctId: ctx.transaction.sender,
    //   pool,
    //   before_sqrt_price,
    //   after_sqrt_price,
    //   amount_in,
    //   amount_out,
    //   fee_amount
    // })
  })
  .onEventCollectRewardEvent(async (event, ctx) => {
    ctx.meter.Counter("collect_reward_counter").add(1)
  })
  .onEventSwapResult(async (event, ctx) => {
    ctx.meter.Counter("swap_result_counter").add(1)
  })

// pool_script.bind({ network: SuiNetwork.TEST_NET })




