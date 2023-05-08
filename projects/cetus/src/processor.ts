import { SuiContext, SuiNetwork } from "@sentio/sdk/sui"
import { pool, factory } from "./types/sui/testnet/clmm.js"
import { pool_script } from "./types/sui/testnet/integrate.js"
import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { object_ } from "@sentio/sdk/aptos/builtin/0x1"
import { getPriceBySymbol, getPriceByType } from "@sentio/sdk/utils"
import * as constant from './constant.js'
import { CHAIN_IDS } from "@sentio/sdk"

//get coin address without suffix
function getCoinObjectAddress(type: string) {
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

//get full coin address with suffix
function getCoinFullAddress(type: string) {
  let coin_a_address = ""
  let coin_b_address = ""
  const regex_a = /<[^,]+,/g;
  const regex_b = /0x[^\s>]+>/g;
  const matches_a = type.match(regex_a)
  const matches_b = type.match(regex_b)
  if (matches_a) {
    coin_a_address = matches_a[0].slice(1, -1)
  }
  if (matches_b) {
    coin_b_address = matches_b[0].slice(0, -1)
  }
  return [coin_a_address, coin_b_address]
}

async function calculateTVL_USD(type: string, coin_a_balance: number, coin_b_balance: number, coin_a2b_price: number, date: Date) {
  const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
  const price_a = await getPriceByType(CHAIN_IDS.SUI_MAINNET, coin_a_full_address, date)
  const price_b = await getPriceByType(CHAIN_IDS.SUI_MAINNET, coin_b_full_address, date)

  let [tvl_a, tvl_b] = [0, 0]
  if (price_a) {
    tvl_a = coin_a_balance * price_a
    tvl_b = coin_b_balance / coin_a2b_price * price_a
  }
  else if (price_b) {
    tvl_a = coin_a_balance * coin_a2b_price * price_b
    tvl_b = coin_b_balance * price_b
  }
  else {
    console.log(`price not in sui coinlist, calculate tvl failed for pool w/ ${type}`)
  }

  return tvl_a + tvl_b
}


async function calculateSwapVol_USD(type: string, amount_in: number, amount_out: number, atob: Boolean, date: Date) {
  const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
  const price_a = await getPriceByType(CHAIN_IDS.SUI_MAINNET, coin_a_full_address, date)
  const price_b = await getPriceByType(CHAIN_IDS.SUI_MAINNET, coin_b_full_address, date)
  let vol = 0

  if (price_a) {
    vol = (atob ? amount_in : amount_out) * price_a
  }
  else if (price_b) {
    vol = (atob ? amount_out : amount_in) * price_b
  }
  else {
    console.log(`price not in sui coinlist, calculate vol failed for pool w/ ${type}`)
  }

  return vol
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

    if (!constant.POOLS_INFO_MAINNET.includes(pool_id)) {
      console.log(`pool not in array ${pool_id}`)
    }
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
    if (!constant.POOLS_INFO_MAINNET.includes(pool)) {
      console.log(`Pool not in array ${pool}`)
      return
    }

    const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
    const type = obj.data.type
    const fee_label = (Number(obj.data.content.fields.fee_rate) / 10000).toFixed(2) + "%"
    // console.log(`fee_label ${fee_label} from obj data: ${JSON.stringify(obj.data)}`)

    let [coin_a_address, coin_b_address] = ["", ""]
    if (type) {
      [coin_a_address, coin_b_address] = getCoinObjectAddress(obj.data.type)
    }

    if (!constant.CoinInfoMap_MAINNET[coin_a_address] || !constant.CoinInfoMap_MAINNET[coin_b_address]) {
      console.log(`coin not in map ${coin_a_address} ${coin_b_address}`)
      return
    }


    const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
    const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
    const atob = event.data_decoded.atob
    const symbol_a = constant.CoinInfoMap_MAINNET[coin_a_address].symbol
    const symbol_b = constant.CoinInfoMap_MAINNET[coin_b_address].symbol
    const decimal_a = constant.CoinInfoMap_MAINNET[coin_a_address].decimal
    const decimal_b = constant.CoinInfoMap_MAINNET[coin_b_address].decimal
    const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, atob ? decimal_a : decimal_b)
    const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, atob ? decimal_b : decimal_a)
    const fee_amount = Number(event.data_decoded.fee_amount)
    const partner = event.data_decoded.partner
    const ref_amount = event.data_decoded.ref_amount
    const steps = event.data_decoded.steps
    const vault_a_amount = event.data_decoded.vault_a_amount
    const vault_b_amount = event.data_decoded.vault_b_amount
    // const pairName = constant.POOLS_INFO_MAINNET[pool].pairName
    const pairName = symbol_a + "-" + symbol_b + " " + fee_label
    const usd_volume = await calculateSwapVol_USD(type, amount_in, amount_out, atob, ctx.timestamp)

    ctx.eventLogger.emit("SwapEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      pool,
      before_sqrt_price,
      after_sqrt_price,
      amount_in,
      amount_out,
      usd_volume,
      fee_amount,
      fee_label,
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
      message: `Swap ${amount_in} ${atob ? symbol_a : symbol_b} to ${amount_out} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairName} `
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


//pool object 
for (let i = 0; i < constant.POOLS_INFO_MAINNET.length; i++) {
  const pool_address = constant.POOLS_INFO_MAINNET[i]
  SuiObjectProcessor.bind({
    objectId: pool_address,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: BigInt(1500000)
  }).onTimeInterval(async (self, _, ctx) => {

    if (!self) return
    try {
      // const pairName = constant.POOLS_INFO_MAINNET[pool_addresses].pairName

      //get coin addresses
      const type = self.type
      const [coin_a_address, coin_b_address] = getCoinObjectAddress(type)
      const fee_rate = Number(self.fields.fee_rate)
      const fee_label = (fee_rate / 10000).toFixed(2) + "%"

      //get coin balance
      const symbol_a = constant.CoinInfoMap_MAINNET[coin_a_address].symbol
      const symbol_b = constant.CoinInfoMap_MAINNET[coin_b_address].symbol
      const decimal_a = constant.CoinInfoMap_MAINNET[coin_a_address].decimal
      const decimal_b = constant.CoinInfoMap_MAINNET[coin_b_address].decimal
      const pairName = symbol_a + "-" + symbol_b + " " + fee_label

      // console.log(`pair: ${pairName} symbol:${symbol_a} ${symbol_b} address: ${coin_a_address} ${coin_b_address} type: ${type}`)

      const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, decimal_a)
      const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, decimal_b)

      if (coin_a_balance) {
        ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, { coin_symbol: symbol_a, pairName })
      }

      if (coin_b_balance) {
        ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, { coin_symbol: symbol_b, pairName })
      }

      //record liquidity
      const liquidity = Number(self.fields.liquidity)
      ctx.meter.Gauge("liquidity").record(liquidity, { pairName })

      //record price
      const current_sqrt_price = Number(self.fields.current_sqrt_price)
      let coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (decimal_b - decimal_a)
      let coin_a2b_price = 1 / coin_b2a_price
      ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
      ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName })

      //record tvl
      const tvl = await calculateTVL_USD(type, coin_a_balance, coin_b_balance, coin_a2b_price, ctx.timestamp)
      ctx.meter.Gauge("tvl").record(tvl, { pairName })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }

  }, 60, 10)
}