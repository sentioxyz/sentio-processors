import { SuiContext, SuiNetwork } from "@sentio/sdk/sui"
import { pool, factory } from "./types/sui/testnet/clmm.js"
import { pool_script } from "./types/sui/testnet/integrate.js"
import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { object_ } from "@sentio/sdk/aptos/builtin/0x1"
import { getPriceBySymbol } from "@sentio/sdk/utils"
import * as constant from './constant.js'


function TypeToCoinAddress(type: string) {
  let coin_a_address = ""
  let coin_b_address = ""
  const regex = /0x[a-fA-F0-9]+:/g
  const matches = type.match(regex)
  if (matches && matches.length >= 2) {
    coin_a_address = matches[1].slice(0, -1)
    coin_b_address = matches[2].slice(0, -1)
  }
  return [coin_a_address, coin_b_address]
}



factory.bind({
  address: constant.CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: BigInt(1500000)
})
  .onEventCreatePoolEvent((event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1)
    const coin_type_a = event.data_decoded.coin_type_a
    const coin_type_b = event.data_decoded.coin_type_b
    const pool_id = event.data_decoded.pool_id
    const tick_spacing = event.data_decoded.tick_spacing

    ctx.eventLogger.emit("CreatePoolEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool_id,
      coin_type_a,
      coin_type_b,
      tick_spacing
    })
  })

pool.bind({
  address: constant.CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: BigInt(1500000)
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1)
    const pool = event.data_decoded.pool

    //pool not in list
    if (!constant.POOLS_INFO_MAINNET[pool]) {
      console.log(`Pool not in map ${pool}`)
      return
    }

    const obj = await ctx.client.getObject({ id: pool, options: { showType: true } })
    let [coin_a_address, coin_b_address] = ["", ""]
    if (obj.data.type) {
      [coin_a_address, coin_b_address] = TypeToCoinAddress(obj.data.type)
    }

    if (!constant.CoinInfoMap_MAINNET[coin_a_address] || !constant.CoinInfoMap_MAINNET[coin_b_address]) {
      console.log(`coin not in map ${coin_a_address} ${coin_b_address}`)
      return
    }


    const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
    const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
    const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, constant.CoinInfoMap_MAINNET[coin_a_address].decimal)
    const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, constant.CoinInfoMap_MAINNET[coin_b_address].decimal)
    const fee_amount = Number(event.data_decoded.fee_amount)
    const atob = event.data_decoded.atob
    const partner = event.data_decoded.partner
    const ref_amount = event.data_decoded.ref_amount
    const steps = event.data_decoded.steps
    const vault_a_amount = event.data_decoded.vault_a_amount
    const vault_b_amount = event.data_decoded.vault_b_amount
    const symbol_a = constant.CoinInfoMap_MAINNET[coin_a_address].symbol
    const symbol_b = constant.CoinInfoMap_MAINNET[coin_b_address].symbol
    const pairName = constant.POOLS_INFO_MAINNET[pool].pairName


    const usdc_price = Number(await getPriceBySymbol("usdc", ctx.timestamp))
    const sui_price = Number(await getPriceBySymbol("sui", ctx.timestamp))
    let usd_volume = 0
    if (symbol_a == "USDC" || symbol_b == "USDC") {
      usd_volume = ((symbol_a == "USDC" && atob) || (symbol_b == "USDC" && !atob)) ? amount_in * usdc_price : amount_out * usdc_price
    }
    else if (symbol_a == "SUI" || symbol_b == "SUI") {
      usd_volume = ((symbol_a == "SUI" && atob) || (symbol_b == "SUI" && !atob)) ? amount_in * sui_price : amount_out * sui_price
    }
    else {
      console.log("no usdc or sui in pool" + pool)
      return
    }

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
      symbol_a,
      symbol_b,
      partner,
      ref_amount,
      steps,
      vault_a_amount,
      vault_b_amount,
      coin_symbol: constant.CoinInfoMap_MAINNET[coin_b_address].symbol,
      pairName,
      message: `Swap ${amount_in} ${atob ? symbol_a : symbol_b} to ${amount_out} ${atob ? symbol_b : symbol_a}. USD value: $${usd_volume} }`
    })

    ctx.meter.Gauge("trading_vol_gauge").record(usd_volume, { pairName })

  })
  .onEventAddLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("add_liquidity_counter").add(1)
    const pool = event.data_decoded.pool
    const position = event.data_decoded.position
    const tick_lower = Number(event.data_decoded.tick_lower.bits)
    const tick_upper = Number(event.data_decoded.tick_upper.bits)
    const liquidity = Number(event.data_decoded.liquidity)
    const after_liquidity = Number(event.data_decoded.after_liquidity)
    const amount_a = Number(event.data_decoded.amount_a)
    const amount_b = Number(event.data_decoded.amount_b)

    ctx.eventLogger.emit("AddLiquidityEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      position,
      tick_lower,
      tick_upper,
      liquidity,
      after_liquidity,
      amount_a,
      amount_b
    })
  })
  .onEventRemoveLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("remove_liquidity_counter").add(1)
    const pool = event.data_decoded.pool
    const position = event.data_decoded.position
    const tick_lower = Number(event.data_decoded.tick_lower.bits)
    const tick_upper = Number(event.data_decoded.tick_upper.bits)
    const liquidity = Number(event.data_decoded.liquidity)
    const after_liquidity = Number(event.data_decoded.after_liquidity)
    const amount_a = Number(event.data_decoded.amount_a)
    const amount_b = Number(event.data_decoded.amount_b)
    ctx.eventLogger.emit("RemoveLiquidityEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      position,
      tick_lower,
      tick_upper,
      liquidity,
      after_liquidity,
      amount_a,
      amount_b
    })
  })


//mainnet pool test usdt-usdc
for (const pool_addresses in constant.POOLS_INFO_MAINNET) {
  SuiObjectProcessor.bind({
    objectId: pool_addresses,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: BigInt(1500000)
  }).onTimeInterval(async (self, _, ctx) => {

    if (!self) return
    try {
      const pairName = constant.POOLS_INFO_MAINNET[pool_addresses].pairName

      //get coin addresses
      const type = self.type
      const [coin_a_address, coin_b_address] = TypeToCoinAddress(type)

      //get coin balance
      const symbol_a = constant.CoinInfoMap_MAINNET[coin_a_address].symbol
      const symbol_b = constant.CoinInfoMap_MAINNET[coin_b_address].symbol
      const decimal_a = constant.CoinInfoMap_MAINNET[coin_a_address].decimal
      const decimal_b = constant.CoinInfoMap_MAINNET[coin_b_address].decimal
      // console.log(`pair: ${pairName} symbol:${symbol_a} ${symbol_b} address: ${coin_a_address} ${coin_b_address} type: ${type}`)

      const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, decimal_a)
      const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, decimal_b)

      if (coin_a_balance) {
        ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, {
          coin_symbol: symbol_a,
          pairName
        })
      }

      if (coin_b_balance) {
        ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, {
          coin_symbol: symbol_b,
          pairName
        })
      }

      const fee_rate = Number(self.fields.fee_rate)
      const liquidity = Number(self.fields.liquidity)
      const current_sqrt_price = Number(self.fields.current_sqrt_price)

      let coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (decimal_b - decimal_a)
      let coin_a2b_price = 1 / coin_b2a_price


      ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName, symbol_a, symbol_b })
      ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName, symbol_a, symbol_b })

      ctx.meter.Gauge("liquidity").record(liquidity, { pairName })

      let tvl_a = 0
      let tvl_b = 0
      const usdc_price = Number(await getPriceBySymbol("usdc", ctx.timestamp))
      const sui_price = Number(await getPriceBySymbol("sui", ctx.timestamp))


      if (symbol_b == "USDC") {
        tvl_a = coin_a_balance * coin_a2b_price * usdc_price
        tvl_b = coin_b_balance * usdc_price
      }
      else if (symbol_a == "USDC") {
        tvl_a = coin_a_balance * usdc_price
        tvl_b = coin_b_balance * coin_b2a_price * usdc_price
      }
      else if (symbol_a == "SUI") {
        tvl_a = coin_a_balance * sui_price
        tvl_a = coin_b_balance * coin_b2a_price * sui_price
      }
      else if (symbol_b == "SUI") {
        tvl_a = coin_a_balance * coin_a2b_price * sui_price
        tvl_b = coin_b_balance * sui_price
      }
      else { console.log(`Pool coin no Sui or USDC at ${pool_addresses}`) }

      ctx.meter.Gauge("tvl_a").record(tvl_a, { coin_symbol: symbol_a, pairName })
      ctx.meter.Gauge("tvl_b").record(tvl_b, { coin_symbol: symbol_b, pairName })
      ctx.meter.Gauge("tvl").record(tvl_a + tvl_b, { pairName })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }

  }, 60, 60)
}