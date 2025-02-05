import { liquidity_pool } from './types/aptos/liquidswap_0_5.js'
import { getPairValue } from '@sentio/sdk/aptos/ext'
import { getPair, startVersion } from './utils.js'
import { BigDecimal, Gauge } from '@sentio/sdk'

const lpRate = Gauge.register('lp_rate')

liquidity_pool.bind({ startVersion }).onEventLiquidityAddedEvent(async (evt, ctx) => {
  const { added_x_val, added_y_val, lp_tokens_received } = evt.data_decoded
  const [coinX, coinY, curve] = evt.type_arguments
  const [pair, value] = await Promise.all([
    getPair(coinX, coinY, curve),
    getPairValue(ctx, coinX, coinY, added_x_val, added_y_val),
  ])
  const rate = value.div(new BigDecimal(lp_tokens_received.toString())).toNumber()
  ctx.eventLogger.emit('add_liquidity', {
    distinctId: ctx.transaction.sender,
    pair,
    value: value.toNumber(),
    lpTokens: lp_tokens_received,
    rate,
  })
  lpRate.record(ctx, rate, {
    pair,
  })
})
