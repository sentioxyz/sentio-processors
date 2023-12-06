import { pool } from './types/aptos/testnet/0x73a2aa302e5e40dd9781a3b2d43ab45b3617a562416c16becfbfe66dcf378141.js'
import { AptosDex, getPairValue } from "@sentio/sdk/aptos/ext";
import { Gauge, MetricOptions } from "@sentio/sdk";
import { type_info } from "@sentio/sdk/aptos/builtin/0x1";
import { AptosNetwork, AptosResourcesProcessor, Transaction_UserTransaction } from "@sentio/sdk/aptos";
import { MoveFetchConfig, parseMoveType, TypeDescriptor } from "@sentio/sdk/move";
import { Types } from 'aptos-sdk'

export const commonOptions = {sparse: true}
export const volOptions: MetricOptions = {
  sparse: true,
  // aggregationConfig: {
  //   intervalInMinutes: [60],
  // }
}

export const tvlAll = Gauge.register("tvl_all", commonOptions)
export const tvlByPool = Gauge.register("tvl_by_pool", commonOptions)
export const tvlByPoolNew = Gauge.register("tvl_by_pool_new", commonOptions)
export const tvl = Gauge.register("tvl", commonOptions)
export const volume = Gauge.register("vol", volOptions)
export const volumeByCoin = Gauge.register("vol_by_coin", volOptions)

const liquidSwapCl = new AptosDex(volume, volumeByCoin,
    tvlAll, tvl, tvlByPool, {
      getXReserve: pool => pool.coins_x.value,
      getYReserve: pool => pool.coins_y.value,
      getExtraPoolTags: pool => {
        return {curve: pool.type_arguments[2]}
      },
      poolType: pool.Pool.type()
    })


const POOL_PREFIX = pool.Pool.TYPE_QNAME

const fetchConfig: MoveFetchConfig = {
  resourceChanges: true,
  allEvents: false,
  // resourceConfig: {
  //   moveTypePrefix: POOL_PREFIX,
  // }
}

pool.bind({  startVersion: 638615642 })
    .onEventPoolCreatedEvent(async (evt, ctx) => {
      const coinx = toTypeString(evt.data_decoded.x)
      const coiny = toTypeString(evt.data_decoded.y)
      // ctx.meter.Counter("num_pools").add(1)

      ctx.eventLogger.emit("PoolCreated", {
        distinctId: ctx.transaction.sender,
        pair: await liquidSwapCl.getPair(coinx, coiny),
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
          pair: await liquidSwapCl.getPair(coinx, coiny),
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
        pair: await liquidSwapCl.getPair(coinx, coiny),
      })
    }, fetchConfig)
    .onEventSwapEvent(async (evt, ctx) => {
      const pool = getPool(ctx.transaction)
      const coinx = pool.typeArgs[0].getSignature()
      const coiny = pool.typeArgs[1].getSignature()

      const value = await liquidSwapCl.recordTradingVolume(ctx,
          coinx, coiny,
          sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
          sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
          {})

      // if (value.isGreaterThan(0)) {
        ctx.eventLogger.emit("Swap", {
          distinctId: ctx.transaction.sender,
          value: value,
          xAmount: sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
          yAmount: sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
          pair: await liquidSwapCl.getPair(coinx, coiny),
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
          pair: await liquidSwapCl.getPair(coinx, coiny),
        })
      }
    }, fetchConfig)

AptosResourcesProcessor.bind({
  address: "0xe747d92f105d23dbcd47630ac03ddf3c60ea86d7030ec2170897cd499eb89aa1",
  network: AptosNetwork.TEST_NET,
  startVersion: 638615642
})
    .onTimeInterval(async (rs, ctx) => {
      console.log("sync pools outter", rs)
      await liquidSwapCl.syncPools(rs, ctx)
    }, 60, 24 * 60)

function toTypeString(typ: type_info.TypeInfo) {
  return typ.account_address + "::" + typ.module_name + "::" + typ.struct_name
}

function getPool(tx: Transaction_UserTransaction): TypeDescriptor<pool.Pool<any, any, any>>  {
  for (const change of tx.changes) {
    if (change.type !== 'write_resource') {
      continue
    }
    const writeResource = change as Types.WriteSetChange_WriteResource
    if (!writeResource.data.type.startsWith(POOL_PREFIX)) {
      console.error("wrong resource type get fetched", writeResource.data.type)
      continue
    }
    return parseMoveType(writeResource.data.type)
  }
  throw new Error("no pool found for this transaction")
}

function sum(arr: bigint[]) {
  return arr.reduce((a, b) => a + b, 0n)
}