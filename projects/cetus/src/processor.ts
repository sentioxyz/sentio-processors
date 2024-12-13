import { pool, factory } from "./types/sui/0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb.js"
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate, SuiWrappedObjectProcessor, SuiObjectTypeProcessor } from "@sentio/sdk/sui"
import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from './constant-cetus.js'
// import './cetus-launchpad.js'
import { LRUCache } from 'lru-cache'

import * as helper from './helper/dex-helper.js'
// import './stablefarming.js'

// factory.bind({
//   // address: constant.CLMM_MAINNET,
//   // network: SuiNetwork.MAIN_NET,
//   // startCheckpoint: 1500000n
// })
//   .onEventCreatePoolEvent(async (event, ctx) => {
//     ctx.meter.Counter("create_pool_counter").add(1, { project: "cetus" })
//     const pool_id = event.data_decoded.pool_id

//     const poolInfo = await helper.getOrCreatePool(ctx, pool_id)


//     ctx.eventLogger.emit("CreatePoolEvent", {
//       distinctId: event.sender,
//       pool_id,
//       coin_type_a: poolInfo.type_a,
//       coin_type_b: poolInfo.type_a,
//       symbol_a: poolInfo.symbol_a,
//       symbol_b: poolInfo.symbol_b,
//       decimal_a: poolInfo.decimal_a,
//       decimal_b: poolInfo.decimal_b,
//       pairName: poolInfo.pairName,
//       fee: poolInfo.fee,
//       project: "cetus"
//     })

//     template.bind({
//       objectId: pool_id
//     }, ctx)

//   })



// const ttl = 6 * 60 * 60 * 1000 // 6 hour in milliseconds
// const processedMap = new LRUCache<string, Promise<any>>({
//   max: 1000000,
//   ttl: ttl
// })


// pool.bind({
//   // address: constant.CLMM_MAINNET,
//   // network: SuiNetwork.MAIN_NET,
//   // startCheckpoint: 19548548n
//   // startCheckpoint: 28851331n

// })
//   .onEventSwapEvent(async (event, ctx) => {
//     ctx.meter.Counter("swap_counter").add(1, { project: "cetus" })
//     const pool = event.data_decoded.pool
//     const poolInfo = await helper.getOrCreatePool(ctx, pool)

//     const atob = event.data_decoded.atob
//     const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
//     const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
//     const fee_amount = Number(event.data_decoded.fee_amount) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
//     const after_sqrt_price = event.data_decoded.after_sqrt_price
//     const before_sqrt_price = event.data_decoded.before_sqrt_price
//     const a2b_price = await helper.getA2bPrice(ctx, after_sqrt_price, poolInfo)
//     const partner = event.data_decoded.partner
//     const ref_amount = event.data_decoded.ref_amount
//     const steps = event.data_decoded.steps

//     const vault_a_amount = event.data_decoded.vault_a_amount
//     const vault_b_amount = event.data_decoded.vault_b_amount

//     const usd_volume = await helper.calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

//     const fee_amount_usd = await helper.calculateFee_USD(ctx, pool, fee_amount, atob, ctx.timestamp)

//     ctx.eventLogger.emit("SwapEvent", {
//       distinctId: event.sender,
//       pool,
//       amount_in,
//       amount_out,
//       usd_volume,
//       fee_amount,
//       fee_amount_usd,
//       atob,
//       partner,
//       ref_amount,
//       steps,
//       vault_a_amount: Number(vault_a_amount) / 10 ** poolInfo.decimal_a,
//       vault_b_amount: Number(vault_b_amount) / 10 ** poolInfo.decimal_b,
//       after_sqrt_price,
//       before_sqrt_price,
//       a2b_price,
//       coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
//       coin_type_a: poolInfo.type_a,
//       coin_type_b: poolInfo.type_b,
//       symbol_a: poolInfo.symbol_a,
//       symbol_b: poolInfo.symbol_b,
//       decimal_a: poolInfo.decimal_a,
//       decimal_b: poolInfo.decimal_b,
//       fee: poolInfo.fee,
//       type_in: atob ? poolInfo.symbol_a : poolInfo.symbol_b,
//       type_out: atob ? poolInfo.symbol_b : poolInfo.symbol_a,
//       pairName: poolInfo.pairName,
//       project: "cetus",
//       message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
//     })

//     ctx.meter.Gauge("trading_vol_gauge").record(usd_volume, { pairName: poolInfo.pairName, project: "cetus" })
//     ctx.meter.Counter("trading_vol_counter").add(usd_volume, { pairName: poolInfo.pairName, project: "cetus" })


//   })
//   .onEventAddLiquidityEvent(async (event, ctx) => {
//     ctx.meter.Counter("add_liquidity_counter").add(1, { project: "cetus" })
//     const pool = event.data_decoded.pool
//     if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }

//     const poolInfo = await helper.getOrCreatePool(ctx, pool)
//     const pairName = poolInfo.pairName
//     const decimal_a = poolInfo.decimal_a
//     const decimal_b = poolInfo.decimal_b

//     const position = event.data_decoded.position
//     const tick_lower = Number(event.data_decoded.tick_lower.bits)
//     const tick_upper = Number(event.data_decoded.tick_upper.bits)
//     const liquidity = Number(event.data_decoded.liquidity)
//     const after_liquidity = Number(event.data_decoded.after_liquidity)
//     const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
//     const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

//     const value = await helper.calculateValueUSD(ctx, poolInfo, amount_a, amount_b)

//     ctx.eventLogger.emit("AddLiquidityEvent", {
//       distinctId: event.sender,
//       pool,
//       position,
//       tick_lower,
//       tick_upper,
//       liquidity,
//       after_liquidity,
//       amount_a,
//       amount_b,
//       value,
//       coin_type_a: poolInfo.type_a,
//       coin_type_b: poolInfo.type_b,
//       symbol_a: poolInfo.symbol_a,
//       symbol_b: poolInfo.symbol_b,
//       decimal_a: poolInfo.decimal_a,
//       decimal_b: poolInfo.decimal_b,
//       pairName,
//       fee: poolInfo.fee,
//       project: "cetus",
//       message: `Add USD$${value} Liquidity in ${pairName}`
//     })
//     ctx.meter.Gauge("add_liquidity_gauge").record(value, { pairName })

//   })
//   .onEventRemoveLiquidityEvent(async (event, ctx) => {
//     ctx.meter.Counter("remove_liquidity_counter").add(1, { project: "cetus" })
//     const pool = event.data_decoded.pool
//     if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }

//     const poolInfo = await helper.getOrCreatePool(ctx, pool)
//     const pairName = poolInfo.pairName
//     const decimal_a = poolInfo.decimal_a
//     const decimal_b = poolInfo.decimal_b

//     const position = event.data_decoded.position
//     const tick_lower = Number(event.data_decoded.tick_lower.bits)
//     const tick_upper = Number(event.data_decoded.tick_upper.bits)
//     const liquidity = Number(event.data_decoded.liquidity)
//     const after_liquidity = Number(event.data_decoded.after_liquidity)
//     const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
//     const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)


//     const value = await helper.calculateValueUSD(ctx, poolInfo, amount_a, amount_b)

//     ctx.eventLogger.emit("RemoveLiquidityEvent", {
//       distinctId: event.sender,
//       pool,
//       position,
//       tick_lower,
//       tick_upper,
//       liquidity,
//       after_liquidity,
//       amount_a,
//       amount_b,
//       value,
//       coin_type_a: poolInfo.type_a,
//       coin_type_b: poolInfo.type_b,
//       symbol_a: poolInfo.symbol_a,
//       symbol_b: poolInfo.symbol_b,
//       decimal_a: poolInfo.decimal_a,
//       decimal_b: poolInfo.decimal_b,
//       fee: poolInfo.fee,
//       pairName,
//       project: "cetus",
//       message: `Remove USD$${value} Liquidity in ${pairName}`
//     })
//     ctx.meter.Gauge("remove_liquidity_gauge").record(value, { pairName })

//   })
//   .onEventCollectRewardEvent(async (event, ctx) => {

//     if (processedMap.has(ctx.transaction.digest)) {
//       return
//     }
//     processedMap.set(ctx.transaction.digest, Promise.resolve())

//     //debug
//     // if (ctx.transaction.digest != "HeFFdLQu5ZX3Aqzk935kPf3TXTBuZ9usKFecAYCxv8DR") return


//     let rewardCoinCallInfo: token.TokenInfo[] = []
//     let rewardCoinEventInfo: any[] = []

//     //@ts-ignore
//     const transactions = ctx.transaction.transaction?.data.transaction.transactions
//     for (let i = 0; i < transactions.length; i++) {
//       if (transactions[i].MoveCall
//         && (transactions[i].MoveCall.package == "0xd43348b8879c1457f882b02555ba862f2bc87bcc31b16294ca14a82f608875d2")
//         && (transactions[i].MoveCall.module == "pool_script_v2")
//         && (transactions[i].MoveCall.function == "collect_reward")) {
//         const coinType = transactions[i].MoveCall.type_arguments[transactions[i].MoveCall.type_arguments.length - 1]
//         console.log(`call i=${i} coinType ${coinType}`)
//         const tokenInfo = await helper.getOrCreateCoin(ctx, coinType)
//         rewardCoinCallInfo.push(tokenInfo)
//       }
//     }

//     const events = ctx.transaction.events
//     if (events) {
//       for (let i = 0; i < events.length; i++) {
//         if (events[i].type == "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::CollectRewardEvent") {
//           interface EventInfo {
//             amount: number,
//             pool: string,
//             position: string
//           }
//           //@ts-ignore
//           const {
//             amount,
//             pool,
//             position
//           }: EventInfo = events[i].parsedJson
//           console.log(`event i=${i} amount ${amount} pool ${pool} position ${position}`)

//           rewardCoinEventInfo.push({
//             amount,
//             pool,
//             position
//           })
//         }
//       }
//     }

//     if (rewardCoinEventInfo.length == rewardCoinCallInfo.length) {
//       for (let i = 0; i < rewardCoinEventInfo.length; i++) {
//         ctx.eventLogger.emit("CollectRewardEvent", {
//           distinctId: event.sender,
//           pool: rewardCoinEventInfo[i].pool,
//           position: rewardCoinEventInfo[i].position,
//           amount: Number(rewardCoinEventInfo[i].amount) / 10 ** Number(rewardCoinCallInfo[i].decimal),
//           coin_symbol: rewardCoinCallInfo[i].symbol
//         })
//       }
//     }
//   },
//     {
//       inputs: true,
//       allEvents: true
//     })


// //pool object
// // for (let i = 0; i < constant.POOLS_INFO_MAINNET.length; i++) {
// //   const pool_address = constant.POOLS_INFO_MAINNET[i]

// // bind({
// //   objectId: pool_address,
// //   network: SuiNetwork.MAIN_NET,
// //   startCheckpoint: 1500000n
// // })
// // }

SuiObjectTypeProcessor.bind({
  objectType: pool.Pool.type()
})
  .onTimeInterval(async (self, _, ctx) => {
    if (!self) { return }
    console.log(`ctx ${ctx.objectId} ctx.timestamp ${ctx.timestamp}`)
    try {
      //get coin addresses
      const poolInfo = await helper.getOrCreatePool(ctx, ctx.objectId)
      const symbol_a = poolInfo.symbol_a
      const symbol_b = poolInfo.symbol_b
      const decimal_a = poolInfo.decimal_a
      const decimal_b = poolInfo.decimal_b
      const pairName = poolInfo.pairName
      // console.log(`pair: ${pairName} symbol:${symbol_a} ${symbol_b} address: ${coin_a_address} ${coin_b_address} type: ${type}`)
      //@ts-ignore
      const coin_a_balance = Number(self.data_decoded.coin_a) / Math.pow(10, decimal_a)
      //@ts-ignore
      const coin_b_balance = Number(self.data_decoded.coin_b) / Math.pow(10, decimal_b)

      if (coin_a_balance) {
        ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, { coin_symbol: symbol_a, pairName, project: "cetus" })
      }

      if (coin_b_balance) {
        ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, { coin_symbol: symbol_b, pairName, project: "cetus" })
      }

      //record liquidity
      const liquidity = Number(self.data_decoded.liquidity)
      ctx.meter.Gauge("liquidity").record(liquidity, { pairName, project: "cetus" })

      //record price
      //@ts-ignore
      const current_sqrt_price = Number(self.data_decoded.current_sqrt_price)
      let coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (decimal_b - decimal_a)
      let coin_a2b_price = 1 / coin_b2a_price
      ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName, project: "cetus" })
      ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName, project: "cetus" })

      //record tvl
      // const tvl = await helper.calculateValue_USD(ctx, ctx.objectId, coin_a_balance, coin_b_balance, ctx.timestamp)

      //record one side tvl
      const tvl_a = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_a, coin_a_balance)
      const tvl_b = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_b, coin_b_balance)
      const tvl = tvl_a + tvl_b

      ctx.meter.Gauge("tvl").record(tvl, { pairName, project: "cetus" })
      ctx.meter.Gauge("tvl_oneside").record(tvl_a, { pairName, coin_type: poolInfo.type_a, coin_symbol: symbol_a })
      ctx.meter.Gauge("tvl_oneside").record(tvl_b, { pairName, coin_type: poolInfo.type_b, coin_symbol: symbol_b })


      //eventlogs
      ctx.eventLogger.emit("one_side_tvl", {
        pool: poolInfo.pool,
        tvl: tvl_a,
        type: poolInfo.type_a,
        amount: coin_a_balance,
        symbol: poolInfo.symbol_a,
        decimal: poolInfo.decimal_a,
        pairName: poolInfo.pairName,
        fee: poolInfo.fee
      })

      ctx.eventLogger.emit("one_side_tvl", {
        pool: poolInfo.pool,
        tvl: tvl_b,
        type: poolInfo.type_b,
        amount: coin_b_balance,
        symbol: poolInfo.symbol_b,
        decimal: poolInfo.decimal_b,
        pairName: poolInfo.pairName,
        fee: poolInfo.fee
      })

      ctx.eventLogger.emit("tvl", {
        pool: poolInfo.pool,
        tvl,
        coin_type_a: poolInfo.type_a,
        coin_type_b: poolInfo.type_b,
        symbol_a: poolInfo.symbol_a,
        symbol_b: poolInfo.symbol_b,
        decimal_a: poolInfo.decimal_a,
        decimal_b: poolInfo.decimal_b,
        pairName: poolInfo.pairName,
        fee: poolInfo.fee
      })

    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }
  }, 10, 1440)
