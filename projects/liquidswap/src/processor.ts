import { liquidity_pool } from './types/aptos/liquidswap'
import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";
import { caculateValueInUsd, delay, getCoinInfo, scaleDown } from "./utils";
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import { getRpcClient } from "@sentio/sdk/lib/aptos";
import { AptosClient } from "aptos-sdk";

import * as crypto from "crypto"

const commonOptions = { sparse:  true }
const valueCounter = new Gauge("value", commonOptions)
const amountCounter = new Gauge("amount", commonOptions)
const volumeGauge = new Gauge("vol", commonOptions)
const eventCounter = new Counter("num_event", commonOptions)

// const accountTracker = AccountEventTracker.register("trading")

liquidity_pool.bind({startVersion: 0})
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    const pool = await getPoolName(evt.type_arguments)
    ctx.meter.Counter("num_pools").add(1, { pool })
    // eventCounter.add(ctx, 1, { name: "pool_created"})
    await syncPools(ctx)
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    // const pool = await getPoolName(evt.type_arguments)
    // const timestamp = ctx.transaction.timestamp
    ctx.meter.Counter("event_liquidity_add").add(1)
    await syncPools(ctx)
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    // const  pool = await getPoolName(evt.type_arguments)
    // const timestamp = ctx.transaction.timestamp
    ctx.meter.Counter("event_liquidity_removed").add(1)
    await syncPools(ctx)
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const pool = await getPoolName(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    // accountTracker.trackEvent(ctx, { distinctId: evt.guid.account_address })
    await addForVolume(ctx, evt.type_arguments[0], evt.data_typed.x_in, timestamp, pool)
    await addForVolume(ctx, evt.type_arguments[1], evt.data_typed.y_in, timestamp, pool)
    ctx.meter.Counter("event_swap").add(1)
    await syncPools(ctx)
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    const pool = await getPoolName(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    // accountTracker.trackEvent(ctx, { distinctId: evt.guid.account_address })
    await addForVolume(ctx, evt.type_arguments[0], evt.data_typed.x_in, timestamp, pool)
    await addForVolume(ctx, evt.type_arguments[1], evt.data_typed.y_in, timestamp, pool)

    ctx.meter.Counter("event_flashloan").add(1)
    await syncPools(ctx)
  })

async function addForVolume(ctx: aptos.AptosContext, type: string, amount: bigint, timestamp: string, pool: string) {
  const coin = await getCoinInfo(type)
  const value = await caculateValueInUsd(amount, coin, timestamp)
  volumeGauge.record(ctx, value, { coin: coin.symbol, pool: pool })
}

async function addFor(ctx: aptos.AptosContext, type: string, amount: bigint, timestamp: string, pool: string) {
  const coin = await getCoinInfo(type)
  const value = await caculateValueInUsd(amount, coin, timestamp)
  valueCounter.record(ctx, value, { coin: coin.symbol, pool: pool })
  amountCounter.record(ctx, scaleDown(amount, coin.decimals) , { coin: coin.symbol, pool: pool })
}

// async function subFor(ctx: aptos.AptosContext, type: string, amount: bigint, timestamp: string, pool: string) {
//   const coin = await getCoinInfo(type)
//   const value = await caculateValueInUsd(amount, coin, timestamp)
//   valueCounter.sub(ctx, value, { coin: coin.symbol, pool: pool })
//   amountCounter.sub(ctx, scaleDown(amount, coin.decimals), { coin: coin.symbol, pool: pool })
// }

// TODO pool name should consider not just use symbol name
async function getPoolName(coins: [string, string, string]): Promise<string> {
  const coinx = await getCoinInfo(coins[0])
  const coiny = await getCoinInfo(coins[1])
  const token = coins[2].includes("curves::Stable") ? "S" : "U"
  // const xfullname = coins[0].split("::").slice(1).join("::")
  // const yfullname = coins[1].split("::").slice(1).join("::")
  const id = crypto.createHash("md5").update(coins.join()).digest("hex")
  return `${coinx.symbol}-${coiny.symbol}-${token}-${id.slice(0, 6)}`
   // return [coinx, coiny, pool]
}

const recorded = new Set<bigint>()

async function syncPools(ctx: aptos.AptosContext) {
  const version = BigInt(ctx.version.toString())
  const bucket = version / 100000n;
  if (recorded.has(bucket)) {
    return
  }
  recorded.add(bucket)

  // const client = getRpcClient(aptos.AptosNetwork.MAIN_NET)
  const client = new AptosClient("https://mainnet.aptoslabs.com/")
  // const client = new AptosClient("https://aptos-mainnet.nodereal.io/v1/f0bd2babe59b4308b49df438b7c4ef45")

  let resources = undefined
  while (!resources) {
    resources = await client.getAccountResources('0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948', { ledgerVersion: version})
    await delay(1000)
  }

  const pools = aptos.TYPE_REGISTRY.filterAndDecodeResources<liquidity_pool.LiquidityPool<any, any, any>>("0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityPool", resources)

  for (const pool of pools) {
    const poolName = await getPoolName(pool.type_arguments as [string,string,string])
    await addFor(ctx, pool.type_arguments[0], pool.data_typed.coin_x_reserve.value, ctx.transaction.timestamp, poolName)
    await addFor(ctx, pool.type_arguments[1], pool.data_typed.coin_y_reserve.value, ctx.transaction.timestamp, poolName)
  }
}