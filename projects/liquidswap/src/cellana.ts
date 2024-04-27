import { liquidity_pool } from './types/aptos/cellana.js'
import { AptosDex, getCoinInfo, getPairValue } from '@sentio/sdk/aptos/ext'

import {
  cellanaTvl,
  cellanaTvlAll,
  cellanaTvlByPool,
  cellanaVolume,
  cellanaVolumeByCoin,
  recordAccount,
} from './metrics.js'
import { AptosResourcesProcessor } from '@sentio/sdk/aptos'
import { BigDecimal } from '@sentio/sdk'

const startVersion = 10000

liquidity_pool.bind({ startVersion }).onEventSwapEvent(async (evt, ctx) => {
  const { from_token: coinX, to_token: coinY } = evt.data_decoded
  const coinXInfo = await getCoinInfo(coinX)
  const coinYInfo = await getCoinInfo(coinY)
  ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinXInfo.bridge })
  ctx.meter.Counter('event_swap_by_bridge').add(1, { bridge: coinYInfo.bridge })

  const timestamp = ctx.getTimestamp()
  const amountX = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(
    evt.data_decoded.amount_out,
    coinXInfo,
    timestamp,
    ctx.network,
  )
  const amountY = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(
    evt.data_decoded.amount_in,
    coinYInfo,
    timestamp,
    ctx.network,
  )
  const total = amountX.plus(amountY)
  if (total.gt(0)) {
    cellanaVolume.record(ctx, total, { bridge: coinXInfo.bridge })
  }
  if (amountX.gt(0)) {
    cellanaVolumeByCoin.record(ctx, amountX, {
      coin: coinXInfo.symbol || coinX,
      bridge: coinXInfo.bridge,
      type: coinXInfo.token_type.type,
    })
  }
  if (amountY.gt(0)) {
    cellanaVolumeByCoin.record(ctx, amountY, {
      coin: coinYInfo.symbol || coinY,
      bridge: coinYInfo.bridge,
      type: coinYInfo.token_type.type,
    })
  }
  if (recordAccount) {
    ctx.eventLogger.emit('vol', {
      distinctId: ctx.transaction.sender,
      account: ctx.transaction.sender,
      value: amountX.plus(amountY).div(2).toNumber(),
    })
  }

  // TVL metrics.
  const syncEvent = ctx.transaction.events[ctx.eventIndex + 1].data as liquidity_pool.SyncEvent
  const pair = `${coinXInfo.symbol || coinX}-${coinYInfo.symbol || coinY}`
  const reserveX = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(
    BigInt(syncEvent.reserves_1),
    coinXInfo,
    timestamp,
    ctx.network,
  )
  const reserveY = await CELLANA_SWAP_APTOS.coinList.calculateValueInUsd(
    BigInt(syncEvent.reserves_2),
    coinYInfo,
    timestamp,
    ctx.network,
  )

  const poolValue = reserveX.plus(reserveY)
  cellanaTvlByPool.record(ctx, poolValue, { pair })
  cellanaTvl.record(ctx, reserveX, {
    coin: coinXInfo.symbol || coinX,
    bridge: coinXInfo.bridge,
    type: coinXInfo.token_type.type,
  })
  cellanaTvl.record(ctx, reserveY, {
    coin: coinYInfo.symbol || coinY,
    bridge: coinYInfo.bridge,
    type: coinYInfo.token_type.type,
  })
})

const CELLANA_SWAP_APTOS = new AptosDex<liquidity_pool.SyncEvent>(
  cellanaVolume,
  cellanaVolumeByCoin,
  cellanaTvlAll,
  cellanaTvl,
  cellanaTvlByPool,
  {
    getXReserve: (pool) => pool.reserves_1,
    getYReserve: (pool) => pool.reserves_2,
    getExtraPoolTags: (_) => {},
    poolType: liquidity_pool.SyncEvent.type(),
  },
)
