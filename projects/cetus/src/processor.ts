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
  startCheckpoint: BigInt(1787170)
})
  .onEventCreatePoolEvent((event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1)
    const coin_type_a = event.data_decoded.coin_type_a
    const coin_type_b = event.data_decoded.coin_type_b
    const pool_id = event.data_decoded.pool_id
    const tick_spacing = event.data_decoded.tick_spacing
    //debug
    console.log(`ctx.transaction-- ${JSON.stringify(ctx.transaction)}`)
    console.log(`ctx.transaction.transaction.data.sender-- ${ctx.transaction.transaction.data.sender}`)
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
  startCheckpoint: BigInt(1787170)
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1)
    const pool = event.data_decoded.pool

    //pool not in list
    if (!constant.POOLS_INFO_MAINNET[pool]) {
      console.log(`Pool not in map ${pool}`)
      return
    }


    // try {
    const obj = await ctx.client.getObject({ id: pool, options: { showType: true } })
    // console.log(`get type--${JSON.stringify(obj)}--${obj.data.type}`)
    let [coin_a_address, coin_b_address] = ["", ""]
    if (obj.data.type) {
      [coin_a_address, coin_b_address] = TypeToCoinAddress(obj.data.type)
      // console.log(`coin_a_address ${coin_a_address}, coin_b_address ${coin_b_address}`)
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


    if (symbol_a !== "USDC" && symbol_b !== "USDC") {
      console.log("no usdc in pool" + pool)
      return
    }

    let usdc_volume = ((symbol_a == "USDC" && atob) || (symbol_b == "USDC" && !atob)) ? amount_in : amount_out

    ctx.eventLogger.emit("SwapEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      before_sqrt_price,
      after_sqrt_price,
      amount_in,
      amount_out,
      usdc_volume,
      fee_amount,
      atob,
      partner,
      ref_amount,
      steps,
      vault_a_amount,
      vault_b_amount,
      coin_symbol: constant.CoinInfoMap_MAINNET[coin_b_address].symbol
    })
    // }
    // catch (e) {
    //   console.log(`${e.message} error at ${ctx.transaction.digest}`)
    // }
  })
// .onEventCollectRewardEvent(async (event, ctx) => {
//   ctx.meter.Counter("collect_reward_counter").add(1)
//   const position = event.data_decoded.position
//   const pool = event.data_decoded.pool
//   const amount = event.data_decoded.amount
//   ctx.eventLogger.emit("CollectRewardEvent", {
//     distinctId: ctx.transaction.transaction.data.sender,
//     position,
//     pool,
//     amount
//   })
// })

//mainnet pool test usdt-usdc
for (const pool_addresses in constant.POOLS_INFO_MAINNET) {
  SuiObjectProcessor.bind({
    objectId: pool_addresses,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: BigInt(1698922)
  }).onTimeInterval(async (self, _, ctx) => {

    if (!self) return
    try {
      const pairName = constant.POOLS_INFO_MAINNET[pool_addresses].pairName

      //get coin addresses
      const type = self.type

      // const obj = await ctx.client.getObject({ id: pool_addresses, options: { showType: true } })
      // const type = obj.data.type

      const [coin_a_address, coin_b_address] = TypeToCoinAddress(type)
      //debug self.type
      console.log(`debug self.type--pool: ${pool_addresses}, pairName ${pairName}, type ${type}`)
      return

      //get coin balance
      // const pool_info = await ctx.coder.decodedType(self, pool.Pool.type())
      // const coin_a_balance = Number(pool_info?.coin_a) / Math.pow(10, 6)
      // const coin_b_balance = Number(pool_info?.coin_b) / Math.pow(10, 6)
      const symbol_a = constant.CoinInfoMap_MAINNET[coin_a_address].symbol
      const symbol_b = constant.CoinInfoMap_MAINNET[coin_b_address].symbol
      console.log(`pair: ${pairName} symbol:${symbol_a} ${symbol_b} address: ${coin_a_address} ${coin_b_address} type: ${type}`)

      const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, constant.CoinInfoMap_MAINNET[coin_a_address].decimal)
      const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, constant.CoinInfoMap_MAINNET[coin_b_address].decimal)

      if (coin_a_balance) {
        ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, {
          coin_symbol: symbol_a,
          pairName
        })
      }
      // else { console.log("empty a ", JSON.stringify(pool_info), ctx.timestamp) }

      if (coin_b_balance) {
        ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, {
          coin_symbol: symbol_b,
          pairName
        })
      }
      // else { console.log("empty b ", JSON.stringify(pool_info), ctx.timestamp) }
      const fee_rate = Number(self.fields.fee_rate)
      const liquidity = Number(self.fields.liquidity)
      const current_sqrt_price = Number(self.fields.current_sqrt_price)
      let coin_a2b_price = Number(current_sqrt_price) ** 2 / (2 ** 192)
      let coin_b2a_price = (1 / coin_a2b_price) * 10 ** 12

      ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
      ctx.meter.Gauge("liquidity").record(liquidity, { pairName })

      let tvl_a = 0
      let tvl_b = 0
      const usdc_price = Number(await getPriceBySymbol("usdc", ctx.timestamp))

      if (symbol_b == "USDC") {
        tvl_a = coin_a_balance * coin_a2b_price * usdc_price
        tvl_b = coin_b_balance * usdc_price
      }
      else if (symbol_a == "USDC") {
        tvl_a = coin_a_balance * usdc_price
        tvl_b = coin_b_balance * coin_b2a_price * usdc_price
      }

      ctx.meter.Gauge("tvl_a").record(tvl_a, { coin_symbol: symbol_a, pairName })
      ctx.meter.Gauge("tvl_b").record(tvl_b, { coin_symbol: symbol_b, pairName })
      ctx.meter.Gauge("tvl").record(tvl_a + tvl_b, { pairName })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }

  }, 1440, 60)
}