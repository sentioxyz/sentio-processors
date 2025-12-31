// import { Counter } from '@sentio/sdk'
// import { ERC20Processor } from '@sentio/sdk/eth/builtin'

// const tokenCounter = Counter.register('token')

// const address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

// ERC20Processor.bind({ address }).onEventTransfer(async (event, ctx) => {
//   const val = event.args.value.scaleDown(18)
//   tokenCounter.add(ctx, val)
// })


import { pool, credit_manager } from './types/aptos/testnet/moar.js'
import { Gauge } from "@sentio/sdk";

// Removed unused deprecated imports: getCoinInfo, getPairValue, AptosDex

import { AptosResourcesProcessor } from "@sentio/sdk/aptos";
// import { pool } from "./types/aptos/testnet/moar.js";

const commonOptions = { sparse: true }
export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

// @todo: get startVersion from the contract
const startVersion = 10463608

const tvlAll = Gauge.register("tvl_all", commonOptions)
const tvl = Gauge.register("tvl", commonOptions)
const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
const volume = Gauge.register("vol", volOptions)
const volumeByCoin = Gauge.register("vol_by_coin", volOptions)

// const accountTracker = AccountEventTracker.register("users")

// pool.bind()
//     .onEventDepositEvent(async (evt, ctx)=>{
//       // console.log(JSON.stringify(evt))
//       ctx.eventLogger.emit("Deposit", {
//         distinctId: evt.data_decoded.user,
//         amount: evt.data_decoded.amount,
//         pid: evt.data_decoded.pid,
//       })
//     })
//     .onEventHarvestEvent(async (evt, ctx) => {
//       ctx.eventLogger.emit("Harvest", {
//         distinctId: evt.data_decoded.user,
//         amount: evt.data_decoded.offering_amount,
//         pid: evt.data_decoded.pid
//       })
//     })


pool.bind({ startVersion: startVersion })
  .onEventPoolCreated(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1);
    // ctx.store.upsert
    // ctx.store.get('dede')
    // ctx.getClient().view({
    //   function: credit_manager.get_pool_info,
    //   functionArguments: [evt.data_decoded.pool_id]
    // })
  })


  .onEventDeposited(async (evt, ctx) => {
    ctx.meter.Counter("tvl").add(evt.data_decoded.amount_in, {
      pool_id: evt.data_decoded.pool_id.toString(),
      lp: evt.data_decoded.lp,
    })
  })
