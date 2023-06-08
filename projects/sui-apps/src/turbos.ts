import { pool, pool_factory } from "./types/sui/turbos.js";
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as constant from './constant-turbos.js'
import { SuiChainId } from "@sentio/sdk"
import * as helper from './helper/turbos-clmm-helper.js'

pool_factory.bind({
  address: constant.CLMM_MAINNET,
  network: SuiChainId.SUI_MAINNET,
  startCheckpoint: 1500000n
})
  .onEventPoolCreatedEvent(async (event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1, { vertical: "dex", project: "turbos" })
    const account = event.data_decoded.account
    const fee_protocol = event.data_decoded.fee_protocol
    const pool = event.data_decoded.pool
    const tick_spacing = event.data_decoded.tick_spacing
    const fee = event.data_decoded.fee
    const sqrt_price = event.data_decoded.sqrt_price

    ctx.eventLogger.emit("CreatePoolEvent", {
      distinctId: account,
      account,
      fee_protocol,
      pool,
      tick_spacing,
      fee,
      sqrt_price,
      vertical: "dex", project: "turbos"
    })

    await helper.getOrCreatePool(ctx, pool)

    template.bind({
      objectId: pool
    }, ctx)
  })


pool.bind({
  address: constant.CLMM_MAINNET,
  network: SuiChainId.SUI_MAINNET,
  startCheckpoint: 1500000n
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1, { vertical: "dex", project: "turbos" })
    const pool = event.data_decoded.pool
    const recipient = event.data_decoded.recipient
    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const atob = event.data_decoded.a_to_b
    const liquidity = Number(event.data_decoded.liquidity)
    const tick_current_index = event.data_decoded.tick_current_index.bits
    const tick_pre_index = event.data_decoded.tick_current_index.bits
    const sqrt_price = Number(event.data_decoded.sqrt_price)
    const protocol_fee = Number(event.data_decoded.protocol_fee)
    const fee_amount = Number(event.data_decoded.fee_amount)
    const is_exact_in = event.data_decoded.is_exact_in

    const symbol_a = poolInfo.symbol_a
    const symbol_b = poolInfo.symbol_b
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b
    const pairName = poolInfo.pairName

    const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
    const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)


    const usd_volume = await helper.calculateSwapVol_USD(poolInfo.type, amount_a, amount_b, atob, ctx.timestamp)

    ctx.eventLogger.emit("SwapEvent", {
      distinctId: recipient,
      pool,
      sqrt_price,
      amount_a,
      amount_b,
      atob,
      usd_volume,
      liquidity,
      tick_current_index,
      tick_pre_index,
      protocol_fee,
      is_exact_in,
      fee_amount,
      coin_symbol: atob ? symbol_a : symbol_b, //for amount_in
      pairName,
      vertical: "dex", project: "turbos",
      message: `Swap ${atob ? amount_a : amount_b} ${atob ? symbol_a : symbol_b} to ${atob ? amount_b : amount_a} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairName} `
    })

    ctx.meter.Gauge("trading_vol_gauge").record(usd_volume, { pairName, vertical: "dex", project: "turbos" })
    ctx.meter.Counter("trading_vol_counter").add(usd_volume, { pairName, vertical: "dex", project: "turbos" })

  })
  .onEventMintEvent(async (event, ctx) => {
    ctx.meter.Counter("add_liquidity_counter").add(1, { vertical: "dex", project: "turbos" })
    const pool = event.data_decoded.pool
    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b

    const owner = event.data_decoded.owner
    const tick_lower_index = Number(event.data_decoded.tick_lower_index.bits)
    const tick_upper_index = Number(event.data_decoded.tick_upper_index.bits)
    const liquidity_delta = Number(event.data_decoded.liquidity_delta)
    const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
    const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)
    const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
    const value = value_a + value_b
    ctx.eventLogger.emit("AddLiquidityEvent", {
      distinctId: owner,
      pool,
      tick_lower_index,
      tick_upper_index,
      liquidity_delta,
      amount_a,
      amount_b,
      value,
      pairName,
      vertical: "dex", project: "turbos",
      message: `Add USD$${value} Liquidity in ${pairName}`
    })
    ctx.meter.Gauge("add_liquidity_gauge").record(value, { pairName, vertical: "dex", project: "turbos" })

  })
  .onEventBurnEvent(async (event, ctx) => {
    ctx.meter.Counter("remove_liquidity_counter").add(1, { vertical: "dex", project: "turbos" })
    const pool = event.data_decoded.pool
    const poolInfo = await helper.getOrCreatePool(ctx, pool)
    const pairName = poolInfo.pairName
    const decimal_a = poolInfo.decimal_a
    const decimal_b = poolInfo.decimal_b

    const owner = event.data_decoded.owner
    const tick_lower_index = Number(event.data_decoded.tick_lower_index.bits)
    const tick_upper_index = Number(event.data_decoded.tick_upper_index.bits)
    const liquidity_delta = Number(event.data_decoded.liquidity_delta)
    const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
    const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)
    const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
    const value = value_a + value_b

    ctx.eventLogger.emit("RemoveLiquidityEvent", {
      distinctId: owner,
      pool,
      tick_lower_index,
      tick_upper_index,
      liquidity_delta,
      amount_a,
      amount_b,
      value,
      pairName,
      vertical: "dex", project: "turbos",
      message: `Remove USD$${value} Liquidity in ${pairName}`
    })
    ctx.meter.Gauge("remove_liquidity_gauge").record(value, { pairName, vertical: "dex", project: "turbos" })

  })



// pool object 
// for (let i = 0; i < constant.POOLS_INFO_MAINNET.length; i++) {
//   const pool_address = constant.POOLS_INFO_MAINNET[i]
//   SuiObjectProcessor.bind({
//     objectId: pool_address,
//     network: SuiChainId.SUI_MAINNET,
//     startCheckpoint: 2000000n
//   })
const template = new SuiObjectProcessorTemplate()
  .onTimeInterval(async (self, _, ctx) => {
    if (self) {
      try {
        //get coin addresses
        const poolInfo = await helper.getOrCreatePool(ctx, ctx.objectId)
        const symbol_a = poolInfo.symbol_a
        const symbol_b = poolInfo.symbol_b
        const decimal_a = poolInfo.decimal_a
        const decimal_b = poolInfo.decimal_b
        const pairName = poolInfo.pairName
        const [coin_a_address, coin_b_address] = helper.getCoinObjectAddress(poolInfo.type)
        const coin_a_bridge = helper.getBridgeInfo(coin_a_address)
        const coin_b_bridge = helper.getBridgeInfo(coin_b_address)


        const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, decimal_a)
        const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, decimal_b)
        console.log(`pair: ${pairName} \nsymbol:${symbol_a} ${symbol_b}, \ncoin_a_balance ${coin_a_balance} coin_b_balance ${coin_b_balance}, \npool ${ctx.objectId}`)
        if (coin_a_balance) {
          ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, { coin_symbol: symbol_a, pairName, vertical: "dex", project: "turbos" })
        }

        if (coin_b_balance) {
          ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, { coin_symbol: symbol_b, pairName, vertical: "dex", project: "turbos" })
        }

        //record liquidity
        const liquidity = Number(self.fields.liquidity)
        ctx.meter.Gauge("liquidity").record(liquidity, { pairName, vertical: "dex", project: "turbos" })

        //record price
        await helper.getPoolPrice(ctx, ctx.objectId)

        //record tvl
        const [tvl_a, tvl_b] = await helper.calculateValue_USD(ctx, ctx.objectId, coin_a_balance, coin_b_balance, ctx.timestamp)
        const tvl = tvl_a + tvl_b        
        ctx.meter.Gauge("tvl").record(tvl, { pairName, vertical: "dex", project: "turbos" })
        ctx.meter.Gauge("tvl_oneside").record(tvl_a, { pairName, bridge: coin_a_bridge, coin: coin_a_address, vertical: "dex", project: "turbos" })
        ctx.meter.Gauge("tvl_oneside").record(tvl_b, { pairName, bridge: coin_b_bridge, coin: coin_b_address, vertical: "dex", project: "turbos"  })

        // console.log(`pair: ${pairName} \nsymbol:${symbol_a} ${symbol_b}, \ncoin_a_balance ${coin_a_balance} coin_b_balance ${coin_b_balance}, \npool ${ctx.objectId} \nliquidity: ${liquidity} \ntvl: ${tvl} `)

      }
      catch (e) {
        console.log(`${e.message} error at ${JSON.stringify(self)}`)
      }
    }

  }, 60, 10, undefined, { owned: false })
// }