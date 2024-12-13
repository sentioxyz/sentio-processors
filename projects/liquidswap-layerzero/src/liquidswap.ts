import { BigDecimal } from '@sentio/sdk'
import * as v0 from './types/aptos/liquidswap_0_5.js'
import * as v05 from './types/aptos/liquidswap_0_5.js'
import { startVersion } from './utils.js'
import { AptosCoinList, getPairValue } from '@sentio/sdk/aptos/ext'

for (const env of [v0, v05]) {
  const { liquidity_pool } = env
  const ver = env == v0 ? 'v0' : 'v0.5'

  liquidity_pool
    .bind({ startVersion })
    .onEventLiquidityAddedEvent(async (evt, ctx) => {
      const [coinX, coinY] = evt.type_arguments
      const [coinXInfo, coinYInfo] = await Promise.all([
        AptosCoinList.getCoinInfo(coinX),
        AptosCoinList.getCoinInfo(coinY),
      ])
      if ([coinXInfo.bridge, coinYInfo.bridge].includes('LayerZero')) {
        const { added_x_val, added_y_val } = evt.data_decoded
        const amount = await getPairValue(ctx, coinX, coinY, added_x_val, added_y_val)
        ctx.eventLogger.emit('tx', {
          distinctId: ctx.transaction.sender,
          ver,
          amount: amount.toNumber(),
        })
      }
    })
    .onEventSwapEvent(async (evt, ctx) => {
      const [coinX, coinY] = evt.type_arguments
      const [coinXInfo, coinYInfo] = await Promise.all([
        AptosCoinList.getCoinInfo(coinX),
        AptosCoinList.getCoinInfo(coinY),
      ])
      if ([coinXInfo.bridge, coinYInfo.bridge].includes('LayerZero')) {
        const { x_in, x_out, y_in, y_out } = evt.data_decoded
        let amount = BigDecimal(0)
        if (coinXInfo.bridge == 'LayerZero') {
          amount = amount.plus(await AptosCoinList.calculateValueInUsd(x_in + x_out, coinXInfo, ctx.getTimestamp()))
        }
        if (coinYInfo.bridge == 'LayerZero') {
          amount = amount.plus(await AptosCoinList.calculateValueInUsd(y_in + y_out, coinYInfo, ctx.getTimestamp()))
        }
        ctx.eventLogger.emit('tx', {
          distinctId: ctx.transaction.sender,
          ver,
          amount: amount.toNumber(),
        })
      }
    })
    .onEventFlashloanEvent(async (evt, ctx) => {
      const [coinX, coinY] = evt.type_arguments
      const [coinXInfo, coinYInfo] = await Promise.all([
        AptosCoinList.getCoinInfo(coinX),
        AptosCoinList.getCoinInfo(coinY),
      ])
      if ([coinXInfo.bridge, coinYInfo.bridge].includes('LayerZero')) {
        const { x_in, x_out, y_in, y_out } = evt.data_decoded
        let amount = BigDecimal(0)
        if (coinXInfo.bridge == 'LayerZero') {
          amount = amount.plus(await AptosCoinList.calculateValueInUsd(x_in + x_out, coinXInfo, ctx.getTimestamp()))
        }
        if (coinYInfo.bridge == 'LayerZero') {
          amount = amount.plus(await AptosCoinList.calculateValueInUsd(y_in + y_out, coinYInfo, ctx.getTimestamp()))
        }
        ctx.eventLogger.emit('tx', {
          distinctId: ctx.transaction.sender,
          ver,
          amount: amount.toNumber(),
        })
      }
    })
}
