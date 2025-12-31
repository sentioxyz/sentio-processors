import { pool } from './types/aptos/0x54cb0bb2c18564b86e34539b9f89cfe1186e39d89fce54e1cd007b8e61673a85.js'
import { AptosDex, getPairValue } from "@sentio/sdk/aptos/ext";
import { Gauge, MetricOptions } from "@sentio/sdk";
import { type_info } from "@sentio/sdk/aptos/builtin/0x1";
import { AptosNetwork, AptosResourcesProcessor } from "@sentio/sdk/aptos";
import { MoveFetchConfig, parseMoveType, TypeDescriptor } from "@sentio/sdk/move";
// import { Types } from 'aptos-sdk'
import { whitelistTokens, TokenInfo } from "@sentio/sdk/aptos/ext";
import { UserTransactionResponse, WriteSetChangeWriteResource } from "@aptos-labs/ts-sdk";

export const commonOptions = { sparse: true }
export const volOptions: MetricOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

function setTestCoin() {
  const list = whitelistTokens()
  const btc: TokenInfo = {
    type: "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC",
    name: "BTC",
    symbol: "BTC",
    decimals: 8,
    bridge: "Native",
    category: "Native"
  }

  const busd: TokenInfo = {
    type: "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT",
    name: "USDT",
    symbol: "USDT",
    decimals: 6,
    bridge: "Native",
    category: "Native"
  }
  list.set(btc.type, btc)
  list.set(busd.type, busd)
}

setTestCoin()

export const tvlAll = Gauge.register("tvl_all", commonOptions)
export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const tvlByPoolNew = Gauge.register("tvl_by_pool_new", commonOptions)
export const tvl = Gauge.register("tvl", commonOptions)
export const volume = Gauge.register("vol", volOptions)
export const volumeByCoin = Gauge.register("vol_by_coin", volOptions)
export const feeByPool = Gauge.register("fee_by_pool", volOptions)

const liquidSwapCl = new AptosDex(volume, volumeByCoin,
  tvlAll, tvl, tvlByPool, {
  getXReserve: pool => pool.coins_x.value,
  getYReserve: pool => pool.coins_y.value,
  getExtraPoolTags: pool => {
    return { curve: pool.type_arguments[2] }
  },
  poolType: pool.Pool.type()
})


const POOL_PREFIX = pool.Pool.TYPE_QNAME

const fetchConfig: MoveFetchConfig = {
  resourceChanges: true,
  allEvents: false,
  inputs: true,
  resourceConfig: {
    moveTypePrefix: POOL_PREFIX,
  }
}

pool.bind()
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    const coinx = toTypeString(evt.data_decoded.x)
    const coiny = toTypeString(evt.data_decoded.y)
    // ctx.meter.Counter("num_pools").add(1)

    ctx.eventLogger.emit("PoolCreated", {
      distinctId: ctx.transaction.sender,
      pair: await liquidSwapCl.getPair(coinx, coiny, AptosNetwork.MAIN_NET),
      binStep: evt.data_decoded.bin_step,
      poolId: evt.data_decoded.pool_id,
    })
  }, fetchConfig)
  .onEventMintEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const value = await getPairValue(ctx, coinx, coiny, sum(evt.data_decoded.x_liq), sum(evt.data_decoded.y_liq))

    ctx.eventLogger.emit("Mint", {
      distinctId: ctx.transaction.sender,
      xAmount: sum(evt.data_decoded.x_liq),
      yAmount: sum(evt.data_decoded.y_liq),
      value: value,
      pair: await liquidSwapCl.getPair(coinx, coiny, AptosNetwork.MAIN_NET),
    })
  }, fetchConfig)
  .onEventBurnEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const value = await getPairValue(ctx, coinx, coiny, sum(evt.data_decoded.x_liq_reedemed), sum(evt.data_decoded.y_liq_reedemed))

    ctx.eventLogger.emit("Burn", {
      distinctId: ctx.transaction.sender,
      xAmount: sum(evt.data_decoded.x_liq_reedemed),
      yAmount: sum(evt.data_decoded.y_liq_reedemed),
      value: value,
      pair: await liquidSwapCl.getPair(coinx, coiny, AptosNetwork.MAIN_NET),
    })
  }, fetchConfig)
  .onEventSwapEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const pair = await liquidSwapCl.getPair(coinx, coiny, AptosNetwork.MAIN_NET)

    const value = await liquidSwapCl.recordTradingVolume(ctx,
      coinx, coiny,
      sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
      sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
      {})

    feeByPool.record(ctx, sum(evt.data_decoded.fees), { pair })

    // if (value.isGreaterThan(0)) {
    ctx.eventLogger.emit("Swap", {
      distinctId: ctx.transaction.sender,
      value: value,
      xAmount: sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
      yAmount: sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
      pair,
      fee: sum(evt.data_decoded.fees),
      protocolFee: sum(evt.data_decoded.protocol_fees)
    })
    // }
  }, fetchConfig)
  .onEventFlashloanEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()

    const value = await liquidSwapCl.recordTradingVolume(ctx,
      coinx, coiny,
      evt.data_decoded.loan_x,
      evt.data_decoded.loan_y,
      {})

    if (value.isGreaterThan(0)) {
      ctx.eventLogger.emit("FlashLoan", {
        distinctId: ctx.transaction.sender,
        value: value,
        xAmount: evt.data_decoded.loan_x,
        yAmount: evt.data_decoded.loan_y,
        pair: await liquidSwapCl.getPair(coinx, coiny, AptosNetwork.MAIN_NET),
      })
    }
  }, fetchConfig)

AptosResourcesProcessor.bind({
  address: "0xa0d8702b7c696d989675cd2f894f44e79361531cff115c0063390922f5463883",
  // startVersion: 638615642
})
  .onTimeInterval(async (rs, ctx) => {
    console.log("sync pools outter", rs)
    await liquidSwapCl.syncPools(rs, ctx)
  }, 60, 24 * 60)

function toTypeString(typ: type_info.TypeInfo) {
  return typ.account_address + "::" + typ.module_name + "::" + typ.struct_name
}

function getPool(tx: UserTransactionResponse): TypeDescriptor<pool.Pool<any, any, any>> {
  for (const change of tx.changes) {
    if (change.type !== 'write_resource') {
      continue
    }
    const writeResource = change as WriteSetChangeWriteResource
    if (!writeResource.data.type.startsWith(POOL_PREFIX)) {
      // console.error("wrong resource type get fetched", writeResource.data.type)
      continue
    }
    return parseMoveType(writeResource.data.type)
  }
  throw new Error("no pool found for this transaction")
}

function sum(arr: bigint[]) {
  return arr.reduce((a, b) => a + b, 0n)
}