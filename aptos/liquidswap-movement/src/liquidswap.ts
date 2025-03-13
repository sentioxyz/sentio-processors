import { pool } from './types/aptos/movement-mainnet/liquidswap.js'
import { AptosDex, getPairValue } from '@sentio/sdk/aptos/ext'
import { Gauge, MetricOptions } from '@sentio/sdk'
import { type_info } from '@sentio/sdk/aptos/builtin/0x1'
import { AptosNetwork, AptosResourcesProcessor } from '@sentio/sdk/aptos'
import { MoveFetchConfig, parseMoveType, TypeDescriptor } from '@sentio/sdk/move'
// import { Types } from 'aptos-sdk'
import { UserTransactionResponse, WriteSetChangeWriteResource } from '@aptos-labs/ts-sdk'

export const commonOptions = { sparse: true }
export const volOptions: MetricOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60]
  }
}

// function setTestCoin() {
//   const list = whitelistCoins()
//   const btc: SimpleCoinInfo = {
//     token_type: {
//       type: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC',
//       account_address: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9'
//     },
//     symbol: 'BTC',
//     decimals: 8,
//     bridge: 'native'
//   }

//   const busd: SimpleCoinInfo = {
//     token_type: {
//       type: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT',
//       account_address: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9'
//     },
//     symbol: 'USDT',
//     decimals: 6,
//     bridge: 'native'
//   }
//   list.set(btc.token_type.type, btc)
//   list.set(busd.token_type.type, busd)
// }

// setTestCoin()

export const tvlAll = Gauge.register('tvl_all', commonOptions)
export const tvlByPool = Gauge.register('tvl_by_pool', commonOptions)
export const tvlByPoolNew = Gauge.register('tvl_by_pool_new', commonOptions)
export const tvl = Gauge.register('tvl', commonOptions)
export const volume = Gauge.register('vol', volOptions)
export const volumeByCoin = Gauge.register('vol_by_coin', volOptions)
export const feeByPool = Gauge.register('fee_by_pool', volOptions)

const ver = 'v1'

const liquidSwapCl = new AptosDex(volume, volumeByCoin, tvlAll, tvl, tvlByPool, {
  getXReserve: (pool) => pool.coins_x.value,
  getYReserve: (pool) => pool.coins_y.value,
  getExtraPoolTags: (pool) => {
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
    moveTypePrefix: POOL_PREFIX
  }
}

pool
  .bind({ network: AptosNetwork.MOVEMENT_MAIN_NET, baseLabels: { ver } })
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    const coinx = toTypeString(evt.data_decoded.x)
    const coiny = toTypeString(evt.data_decoded.y)
    ctx.meter.Counter('num_pools').add(1, { ver })

    ctx.eventLogger.emit('PoolCreated', {
      distinctId: ctx.transaction.sender,
      pair: await liquidSwapCl.getPair(coinx, coiny, ctx.network),
      binStep: evt.data_decoded.bin_step,
      poolId: evt.data_decoded.pool_id,
      ver
    })
  }, fetchConfig)
  .onEventMintEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const value = await getPairValue(ctx, coinx, coiny, sum(evt.data_decoded.x_liq), sum(evt.data_decoded.y_liq))

    ctx.eventLogger.emit('Mint', {
      distinctId: ctx.transaction.sender,
      xAmount: sum(evt.data_decoded.x_liq),
      yAmount: sum(evt.data_decoded.y_liq),
      value: value,
      pair: await liquidSwapCl.getPair(coinx, coiny, ctx.network),
      ver
    })
  }, fetchConfig)
  .onEventBurnEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const value = await getPairValue(
      ctx,
      coinx,
      coiny,
      sum(evt.data_decoded.x_liq_reedemed),
      sum(evt.data_decoded.y_liq_reedemed)
    )

    ctx.eventLogger.emit('Burn', {
      distinctId: ctx.transaction.sender,
      xAmount: sum(evt.data_decoded.x_liq_reedemed),
      yAmount: sum(evt.data_decoded.y_liq_reedemed),
      value: value,
      pair: await liquidSwapCl.getPair(coinx, coiny, ctx.network),
      ver
    })
  }, fetchConfig)
  .onEventSwapEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()
    const pair = await liquidSwapCl.getPair(coinx, coiny, ctx.network)

    const value = await liquidSwapCl.recordTradingVolume(
      ctx,
      coinx,
      coiny,
      sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
      sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
      { ver }
    )

    feeByPool.record(ctx, sum(evt.data_decoded.fees), { pair, ver })

    // if (value.isGreaterThan(0)) {
    ctx.eventLogger.emit('Swap', {
      distinctId: ctx.transaction.sender,
      value: value,
      xAmount: sum(evt.data_decoded.x_in) + sum(evt.data_decoded.x_out),
      yAmount: sum(evt.data_decoded.y_in) + sum(evt.data_decoded.y_out),
      pair,
      fee: sum(evt.data_decoded.fees),
      protocolFee: sum(evt.data_decoded.protocol_fees),
      ver
    })
    // }
  }, fetchConfig)
  .onEventFlashloanEvent(async (evt, ctx) => {
    const pool = getPool(ctx.transaction)
    const coinx = pool.typeArgs[0].getSignature()
    const coiny = pool.typeArgs[1].getSignature()

    const value = await liquidSwapCl.recordTradingVolume(
      ctx,
      coinx,
      coiny,
      evt.data_decoded.loan_x,
      evt.data_decoded.loan_y,
      { ver }
    )

    if (value.isGreaterThan(0)) {
      ctx.eventLogger.emit('FlashLoan', {
        distinctId: ctx.transaction.sender,
        value: value,
        xAmount: evt.data_decoded.loan_x,
        yAmount: evt.data_decoded.loan_y,
        pair: await liquidSwapCl.getPair(coinx, coiny, ctx.network),
        ver
      })
    }
  }, fetchConfig)

AptosResourcesProcessor.bind({
  network: AptosNetwork.MOVEMENT_MAIN_NET,
  address: '0xeef5ce9727e7faf3b83cb0630e91d45612eac563f670eecaadf1cb22c3bdfdfb',
  baseLabels: { ver },
  startVersion: 77312
}).onTimeInterval(
  async (rs, ctx) => {
    console.log('sync pools outter', rs)
    await liquidSwapCl.syncPools(rs, ctx)
  },
  60,
  24 * 60
)

function toTypeString(typ: type_info.TypeInfo) {
  return typ.account_address + '::' + typ.module_name + '::' + typ.struct_name
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
  throw new Error('no pool found for this transaction')
}

function sum(arr: bigint[]) {
  return arr.reduce((a, b) => a + b, 0n)
}
