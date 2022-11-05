import { swap } from './types/aptos/pancake-swap'
import { AccountEventTracker, aptos, Gauge } from "@sentio/sdk";
import { AptosClient } from "aptos-sdk";

import { AptosDex, getCoinInfo, delay } from "@sentio-processor/common/dist/aptos"

import { TypedMoveResource } from "@sentio/sdk/lib/aptos/types";
import { AptosResourceContext } from "@sentio/sdk/lib/aptos/context";

const commonOptions = { sparse:  true }
const tvlAll = new Gauge("tvl_all", commonOptions)
const tvl = new Gauge("tvl", commonOptions)
const tvlByPool = new Gauge("tvl_by_pool", commonOptions)
const volume = new Gauge("vol", commonOptions)

const accountTracker = AccountEventTracker.register("users")

swap.bind({startVersion: 6329998})
  .onEventPairCreatedEvent(async (evt, ctx) => {
    ctx.meter.Counter("num_pools").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    await syncPools(ctx)
  })
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_add").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    await syncPools(ctx)
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    ctx.meter.Counter("event_liquidity_removed").add(1)
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    await syncPools(ctx)
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
              evt.type_arguments[0], evt.type_arguments[1],
  evt.data_typed.amount_x_in + evt.data_typed.amount_x_out,
  evt.data_typed.amount_y_in + evt.data_typed.amount_y_out)

    // console.log(JSON.stringify(ctx.transaction))
    // console.log(JSON.stringify(evt))

    const coinXInfo = await getCoinInfo(evt.type_arguments[0])
    const coinYInfo = await getCoinInfo(evt.type_arguments[1])
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinXInfo.bridge })
    ctx.meter.Counter("event_swap_by_bridge").add(1, { bridge: coinYInfo.bridge })

    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender })
    await syncPools(ctx)
  })

const recorded = new Set<bigint>()

async function syncPools(ctx: aptos.AptosContext) {
  const version = BigInt(ctx.version.toString())
  const bucket = version / 100000n;
  if (recorded.has(bucket)) {
    return
  }
  recorded.add(bucket)

  const normalClient = new AptosClient("https://aptos-mainnet.nodereal.io/v1/0c58c879d41e4eab8fd2fc0406848c2b")

  let pools: TypedMoveResource<swap.TokenPairReserve<any, any>>[] = []

  let resources = undefined
  while (!resources) {
    try {
      resources = await normalClient.getAccountResources(swap.DEFAULT_OPTIONS.address, {ledgerVersion: version})
    } catch (e) {
      console.log("rpc error, retrying", e)
      await delay(1000)
    }
  }
  pools = aptos.TYPE_REGISTRY.filterAndDecodeResources(swap.TokenPairReserve.TYPE_QNAME, resources)

  // @ts-ignore
  ctx.timestampInMicros = parseInt(ctx.transaction.timestamp)
  // @ts-ignore
  await PANCAKE_SWAP_APTOS.syncPools(ctx, pools)
}

const PANCAKE_SWAP_APTOS = new AptosDex(volume, tvlAll, tvl, tvlByPool,{
  getXReserve(pool: swap.TokenPairReserve<any, any>): bigint {
    return pool.reserve_x;
  },
  getXType(pool: TypedMoveResource<swap.TokenPairReserve<any, any>>): string {
    return pool.type_arguments[0];
  },
  getYReserve(pool: swap.TokenPairReserve<any, any>): bigint {
    return pool.reserve_y;
  },
  getYType(pool: TypedMoveResource<swap.TokenPairReserve<any, any>>): string {
    return pool.type_arguments[1];
  },
  poolTypeName: swap.TokenPairReserve.TYPE_QNAME
  },
)
