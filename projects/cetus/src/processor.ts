import { pool, factory } from "./types/sui/testnet/clmm.js"
import { SuiObjectProcessor, SuiContext, SuiObjectsContext } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import * as constant from './constant.js'
import { SuiChainId } from "@sentio/sdk"

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

interface poolInfo {
  symbol_a: string,
  symbol_b: string,
  decimal_a: number,
  decimal_b: number,
  pairName: string,
  type: string
}


let poolInfoMap = new Map<string, Promise<poolInfo>>()
let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()

async function buildCoinInfo(ctx: SuiContext | SuiObjectsContext, coinAddress: string): Promise<token.TokenInfo> {
  const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
  const symbol = metadata.symbol
  const decimal = metadata.decimals
  const name = metadata.name
  console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
  return {
    symbol,
    name,
    decimal
  }
}

const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectsContext, coinAddress: string): Promise<token.TokenInfo> {
  let coinInfo = coinInfoMap.get(coinAddress)
  if (!coinInfo) {
    coinInfo = buildCoinInfo(ctx, coinAddress)
    coinInfoMap.set(coinAddress, coinInfo)
    console.log("set coinInfoMap for " + coinAddress)
  }
  return await coinInfo
}

async function buildPoolInfo(ctx: SuiContext | SuiObjectsContext, pool: string): Promise<poolInfo> {
  let [symbol_a, symbol_b, decimal_a, decimal_b, pairName, type] = ["", "", 0, 0, "", "", ""]

  //pool not in list
  if (!constant.POOLS_INFO_MAINNET.includes(pool)) {
    console.log(`Pool not in array ${pool}`)
  }
  const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
  type = obj.data.type
  const fee_label = (Number(obj.data.content.fields.fee_rate) / 10000).toFixed(2) + "%"
  let [coin_a_full_address, coin_b_full_address] = ["", ""]
  if (type) {
    [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
  }
  const coinInfo_a = await getOrCreateCoin(ctx, coin_a_full_address)
  const coinInfo_b = await getOrCreateCoin(ctx, coin_b_full_address)
  symbol_a = coinInfo_a.symbol
  symbol_b = coinInfo_b.symbol
  decimal_a = coinInfo_a.decimal
  decimal_b = coinInfo_b.decimal
  pairName = symbol_a + "-" + symbol_b + " " + fee_label

  return {
    symbol_a,
    symbol_b,
    decimal_a,
    decimal_b,
    pairName,
    type
  }
}

const getOrCreatePool = async function (ctx: SuiContext | SuiObjectsContext, pool: string): Promise<poolInfo> {
  let infoPromise = poolInfoMap.get(pool)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx, pool)
    poolInfoMap.set(ctx.address, infoPromise)
    console.log("set poolInfoMap for " + pool)
  }
  return await infoPromise
}

async function getPoolPrice(ctx: SuiContext | SuiObjectsContext, pool: string) {
  const obj = await ctx.client.getObject({ id: pool, options: { showType: true, showContent: true } })
  const current_sqrt_price = Number(obj.data.content.fields.current_sqrt_price)
  if (!current_sqrt_price) { console.log(`get pool price error at ${ctx}`) }
  const poolInfo = await getOrCreatePool(ctx, pool)
  const pairName = poolInfo.pairName
  const coin_b2a_price = 1 / (Number(current_sqrt_price) ** 2) * (2 ** 128) * 10 ** (poolInfo.decimal_b - poolInfo.decimal_a)
  const coin_a2b_price = 1 / coin_b2a_price
  ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
  ctx.meter.Gauge("b2a_price").record(coin_b2a_price, { pairName })
  return coin_a2b_price
}


async function calculateValue_USD(ctx: SuiContext | SuiObjectsContext, pool: string, amount_a: number, amount_b: number, date: Date) {
  const poolInfo = await getOrCreatePool(ctx, pool)
  const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(poolInfo.type)
  const price_a = await getPriceByType(SuiChainId.SUI_MAINNET, coin_a_full_address, date)
  const price_b = await getPriceByType(SuiChainId.SUI_MAINNET, coin_b_full_address, date)

  const coin_a2b_price = await getPoolPrice(ctx, pool)

  let [value_a, value_b] = [0, 0]
  if (price_a) {
    value_a = amount_a * price_a
    value_b = amount_b / coin_a2b_price * price_a
  }
  else if (price_b) {
    value_a = amount_a * coin_a2b_price * price_b
    value_b = amount_b * price_b
  }
  else {
    console.log(`price not in sui coinlist, calculate value failed at ${ctx}`)
  }

  return value_a + value_b
}


async function calculateSwapVol_USD(type: string, amount_in: number, amount_out: number, atob: Boolean, date: Date) {
  const [coin_a_full_address, coin_b_full_address] = getCoinFullAddress(type)
  const price_a = await getPriceByType(SuiChainId.SUI_MAINNET, coin_a_full_address, date)
  const price_b = await getPriceByType(SuiChainId.SUI_MAINNET, coin_b_full_address, date)
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
  network: SuiChainId.SUI_MAINNET,
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

    getOrCreatePool(ctx, pool_id)

  })

pool.bind({
  address: constant.CLMM_MAINNET,
  network: SuiChainId.SUI_MAINNET,
  startCheckpoint: BigInt(1500000)
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1)
    const pool = event.data_decoded.pool
    const poolInfo = await getOrCreatePool(ctx, pool)
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

    const usd_volume = await calculateSwapVol_USD(poolInfo.type, amount_in, amount_out, atob, ctx.timestamp)

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
      message: `Swap ${amount_in} ${atob ? symbol_a : symbol_b} to ${amount_out} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairName} `
    })

    ctx.meter.Gauge("trading_vol_gauge").record(usd_volume, { pairName })

  })
  .onEventAddLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("add_liquidity_counter").add(1)
    const pool = event.data_decoded.pool
    const poolInfo = await getOrCreatePool(ctx, pool)
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
    const value = await calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
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
      message: `addLiquidity value ${value} in ${pairName}`
    })
    ctx.meter.Gauge("add_liquidity_gauge").record(value, { pairName })

  })
  .onEventRemoveLiquidityEvent(async (event, ctx) => {
    ctx.meter.Counter("remove_liquidity_counter").add(1)
    const pool = event.data_decoded.pool
    const poolInfo = await getOrCreatePool(ctx, pool)
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
    const value = await calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)

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
      message: `removeLiquidity value ${value} in ${pairName}`
    })
    ctx.meter.Gauge("remove_liquidity_gauge").record(value, { pairName })

  })


//pool object 
for (let i = 0; i < constant.POOLS_INFO_MAINNET.length; i++) {
  const pool_address = constant.POOLS_INFO_MAINNET[i]
  SuiObjectProcessor.bind({
    objectId: pool_address,
    network: SuiChainId.SUI_MAINNET,
    startCheckpoint: BigInt(1500000)
  }).onTimeInterval(async (self, _, ctx) => {

    if (!self) return
    try {
      // const pairName = constant.POOLS_INFO_MAINNET[pool_addresses].pairName

      //get coin addresses
      const type = self.type
      const poolInfo = await getOrCreatePool(ctx, pool_address)
      const symbol_a = poolInfo.symbol_a
      const symbol_b = poolInfo.symbol_b
      const decimal_a = poolInfo.decimal_a
      const decimal_b = poolInfo.decimal_b
      const pairName = poolInfo.pairName
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
      const tvl = await calculateValue_USD(ctx, pool_address, coin_a_balance, coin_b_balance, ctx.timestamp)
      ctx.meter.Gauge("tvl").record(tvl, { pairName })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }

  }, 60, 10)
}



