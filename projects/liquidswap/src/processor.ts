import { liquidity_pool } from './types/aptos/liquidswap'
import { aptos, Counter, Gauge } from "@sentio/sdk";
import { caculateValueInUsd, getCoinInfo, scaleDown } from "./utils";
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";

const valueCounter = new Counter("value")
const amountCounter = new Counter("amount")
const volumeGauge = new Gauge("vol")

liquidity_pool.bind({startVersion: 0})
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    const pool = await getPairNames(evt.type_arguments)
    ctx.meter.Counter("number_pool").add(1, { pool: pool })
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    const pool = await getPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, evt.type_arguments[0], evt.data_typed.added_x_val, timestamp, pool)
    await addFor(ctx, evt.type_arguments[1], evt.data_typed.added_y_val, timestamp, pool)
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    const  pool = await getPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await subFor(ctx, evt.type_arguments[0], evt.data_typed.returned_x_val, timestamp, pool)
    await subFor(ctx, evt.type_arguments[1], evt.data_typed.returned_y_val, timestamp, pool)
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const pool = await getPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, evt.type_arguments[0], evt.data_typed.x_in, timestamp, pool, true)
    await addFor(ctx, evt.type_arguments[1], evt.data_typed.y_in, timestamp, pool, true)
    await subFor(ctx, evt.type_arguments[0], evt.data_typed.x_out, timestamp, pool)
    await subFor(ctx, evt.type_arguments[1], evt.data_typed.y_out, timestamp, pool)
    ctx.meter.Counter("number_swap").add(1)
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    const pool = await getPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, evt.type_arguments[0], evt.data_typed.x_in, timestamp, pool, true)
    await addFor(ctx, evt.type_arguments[1], evt.data_typed.y_in, timestamp, pool, true)
    await subFor(ctx, evt.type_arguments[0], evt.data_typed.x_out, timestamp, pool)
    await subFor(ctx, evt.type_arguments[1], evt.data_typed.y_out, timestamp, pool)

    ctx.meter.Counter("number_flashloan").add(1)
  })

async function addFor(ctx: aptos.AptosContext, type: string, amount: bigint, timestamp: string, pool: string, recordTrading = false) {
  const coin = await getCoinInfo(type)
  const value = await caculateValueInUsd(amount, coin, timestamp)
  valueCounter.add(ctx, value, { coin: coin.symbol, pool: pool })
  amountCounter.add(ctx, scaleDown(amount, coin.decimals) , { coin: coin.symbol, pool: pool })
  if (recordTrading) {
    volumeGauge.record(ctx, value, { coin: coin.symbol, pool: pool })
  }
}

async function subFor(ctx: aptos.AptosContext, type: string, amount: bigint, timestamp: string, pool: string) {
  const coin = await getCoinInfo(type)
  const value = await caculateValueInUsd(amount, coin, timestamp)
  valueCounter.sub(ctx, value, { coin: coin.symbol, pool: pool })
  amountCounter.sub(ctx, scaleDown(amount, coin.decimals), { coin: coin.symbol, pool: pool })
}

async function getPairNames(coins: [string, string, string]): Promise<string> {
  const coinx = await getCoinInfo(coins[0])
  const coiny = await getCoinInfo(coins[1])
  const token = coins[2].includes("curves::Stable") ? "S" : "U"
  // const xfullname = coins[0].split("::").slice(1).join("::")
  // const yfullname = coins[1].split("::").slice(1).join("::")
  const pool = `${coinx.symbol}-${coiny.symbol}-${token}`
  return pool
   // return [coinx, coiny, pool]
}