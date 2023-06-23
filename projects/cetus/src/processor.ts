import { pool, factory } from "./types/sui/testnet/clmm.js"
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from './constant-cetus.js'
import { SuiNetwork } from "@sentio/sdk/sui"
import './cetus-launchpad.js'
import * as helper from './helper/cetus-clmm.js'

factory.bind({
  address: constant.CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventCreatePoolEvent(async (event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1, { project: "cetus" })
    const coin_type_a = event.data_decoded.coin_type_a
    const coin_type_b = event.data_decoded.coin_type_b
    const pool_id = event.data_decoded.pool_id
    const tick_spacing = event.data_decoded.tick_spacing

    ctx.eventLogger.emit("CreatePoolEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool_id,
      coin_type_a,
      coin_type_b,
      tick_spacing,
      project: "cetus"
    })

    helper.getOrCreatePool(ctx, pool_id)

    template.bind({
      objectId: pool_id
    }, ctx)

  })

pool.bind({
  address: constant.CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 1500000n
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1, { project: "cetus" })
    const pool = event.data_decoded.pool
    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
    const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
    const atob = event.data_decoded.atob
    const symbol_a = poolInfo.symbol_a
    const symbol_b = poolInfo.symbol_b
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b
    const pairName = poolInfo.pairName
    const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, atob ? decimal_a : decimal_b)
    const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, atob ? decimal_b : decimal_a)
    const fee_amount = Number(event.data_decoded.fee_amount)
    const partner = event.data_decoded.partner
    const ref_amount = event.data_decoded.ref_amount
    const steps = event.data_decoded.steps
    const vault_a_amount = event.data_decoded.vault_a_amount
    const vault_b_amount = event.data_decoded.vault_b_amount

    const usd_volume = await helper.calculateSwapVol_USD(poolInfo.type, amount_in, amount_out, atob, ctx.timestamp)

    ctx.eventLogger.emit("SwapEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      before_sqrt_price,
      after_sqrt_price,
      amount_in,
      amount_out,
      usd_volume,
      fee_amount,
      atob,
      partner,
      ref_amount,
      steps,
      vault_a_amount,
      vault_b_amount,
      coin_symbol: atob ? symbol_a : symbol_b, //for amount_in
      pairName,
      project: "cetus",
      message: `Swap ${amount_in} ${atob ? symbol_a : symbol_b} to ${amount_out} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairName} `
    })

    ctx.meter.Gauge("trading_vol_gauge").record(usd_volume, { pairName, project: "cetus" })
    ctx.meter.Counter("trading_vol_counter").add(usd_volume, { pairName, project: "cetus" })


  })
  .onEventAddLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("add_liquidity_counter").add(1, { project: "cetus" })
    const pool = event.data_decoded.pool
    if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }

    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b

    const position = event.data_decoded.position
    const tick_lower = Number(event.data_decoded.tick_lower.bits)
    const tick_upper = Number(event.data_decoded.tick_upper.bits)
    const liquidity = Number(event.data_decoded.liquidity)
    const after_liquidity = Number(event.data_decoded.after_liquidity)
    const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
    const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

    const value = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)

    ctx.eventLogger.emit("AddLiquidityEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      position,
      tick_lower,
      tick_upper,
      liquidity,
      after_liquidity,
      amount_a,
      amount_b,
      value,
      pairName,
      project: "cetus",
      message: `Add USD$${value} Liquidity in ${pairName}`
    })
    ctx.meter.Gauge("add_liquidity_gauge").record(value, { pairName })

  })
  .onEventRemoveLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("remove_liquidity_counter").add(1, { project: "cetus" })
    const pool = event.data_decoded.pool
    if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }

    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b

    const position = event.data_decoded.position
    const tick_lower = Number(event.data_decoded.tick_lower.bits)
    const tick_upper = Number(event.data_decoded.tick_upper.bits)
    const liquidity = Number(event.data_decoded.liquidity)
    const after_liquidity = Number(event.data_decoded.after_liquidity)
    const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
    const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

    const value = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)

    ctx.eventLogger.emit("RemoveLiquidityEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      position,
      tick_lower,
      tick_upper,
      liquidity,
      after_liquidity,
      amount_a,
      amount_b,
      value,
      pairName,
      project: "cetus",
      message: `Remove USD$${value} Liquidity in ${pairName}`
    })
    ctx.meter.Gauge("remove_liquidity_gauge").record(value, { pairName })

  })


//pool object
// for (let i = 0; i < constant.POOLS_INFO_MAINNET.length; i++) {
//   const pool_address = constant.POOLS_INFO_MAINNET[i]

// bind({
//   objectId: pool_address,
//   network: SuiNetwork.MAIN_NET,
//   startCheckpoint: 1500000n
// })
// }

const template = new SuiObjectProcessorTemplate()
  .onTimeInterval(async (self, _, ctx) => {
    if (!self || constant.POOLS_TVL_BLACK_LIST.includes(ctx.objectId)) { return }
    try {
      //get coin addresses
      const poolInfo = await helper.getOrCreatePool(ctx, ctx.objectId)
      const symbol_a = poolInfo.symbol_a
      const symbol_b = poolInfo.symbol_b
      const decimal_a = poolInfo.decimal_a
      const decimal_b = poolInfo.decimal_b
      const pairName = poolInfo.pairName
      // console.log(`pair: ${pairName} symbol:${symbol_a} ${symbol_b} address: ${coin_a_address} ${coin_b_address} type: ${type}`)

      const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, decimal_a)
      const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, decimal_b)

      if (coin_a_balance) {
        ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, { coin_symbol: symbol_a, pairName, project: "cetus" })
      }

      if (coin_b_balance) {
        ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, { coin_symbol: symbol_b, pairName, project: "cetus" })
      }

      //record liquidity
      const liquidity = Number(self.fields.liquidity)
      ctx.meter.Gauge("liquidity").record(liquidity, { pairName, project: "cetus" })

      //record price
      const current_sqrt_price = Number(self.fields.current_sqrt_price)
      let coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (decimal_b - decimal_a)
      let coin_a2b_price = 1 / coin_b2a_price
      ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName, project: "cetus" })
      ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName, project: "cetus" })

      //record tvl
      const tvl = await helper.calculateValue_USD(ctx, ctx.objectId, coin_a_balance, coin_b_balance, ctx.timestamp)
      ctx.meter.Gauge("tvl").record(tvl, { pairName, project: "cetus" })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }
  }, 240, 60, undefined, { owned: false })




