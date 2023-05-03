import { SuiNetwork } from "@sentio/sdk/sui";
import { pool, factory } from "./types/sui/testnet/clmm.js";

factory.bind({ network: SuiNetwork.TEST_NET })
  .onEventCreatePoolEvent((event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1)

  })
pool.bind({ network: SuiNetwork.TEST_NET })
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





