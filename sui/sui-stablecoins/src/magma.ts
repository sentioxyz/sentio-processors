import { SuiContext, SuiObjectProcessor, SuiObjectProcessorTemplate } from '@sentio/sdk/sui'
import { pool, factory } from './types/sui/magma.js'
import { getPoolInfo, START_CHECKPOINT, recordTx, recordSwap } from './utils.js'
import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'
import { usdPools } from './pools.js'

async function handleEvent(evt: pool.AddLiquidityEventInstance, ctx: SuiContext) {
  const { pool } = evt.data_decoded
  const { symbol_a, symbol_b } = await getPoolInfo(ctx, pool)
  if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
    const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
    recordTx(ctx, evt.sender, symbol, 'magma')
  }
}

pool
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventAddLiquidityEvent(handleEvent)
  .onEventRemoveLiquidityEvent(handleEvent)
  .onEventOpenPositionEvent(handleEvent)
  .onEventClosePositionEvent(handleEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const { pool, amount_in, amount_out, atob } = evt.data_decoded
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, pool)
    if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
      const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
      recordTx(ctx, evt.sender, symbol, 'magma')
    }
    if (symbol_a.includes('USD') && symbol_b.includes('USD')) {
      const pair = atob ? `${symbol_a}-${symbol_b}` : `${symbol_b}-${symbol_a}`
      recordSwap(ctx, evt.sender, pair, decimal_a, decimal_b, amount_in, amount_out, 'magma')
    }
  })

const poolTemplate = new SuiObjectProcessorTemplate().onTimeInterval(
  async (self, objects, ctx) => {
    const { coin_a, coin_b } = self.fields as unknown as pool.Pool<any, any>
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
    if (symbol_a.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_a,
        amount: BigInt(coin_a).scaleDown(decimal_a),
        platform: 'magma'
      })
    }
    if (symbol_b.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_b,
        amount: BigInt(coin_b).scaleDown(decimal_b),
        platform: 'magma'
      })
    }
  },
  60 * 12,
  60 * 24
)

// factory.bind().onEventCreatePoolEvent(async (evt, ctx) => {
//   const { pool_id, coin_type_a, coin_type_b } = evt.data_decoded
//   console.log('new magma pool', pool_id, coin_type_a, coin_type_b)
//   const [infoX, infoY] = await Promise.all([
//     getCoinInfoWithFallback('0x' + coin_type_a),
//     getCoinInfoWithFallback('0x' + coin_type_b)
//   ])
//   if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
//     const startCheckpoint = ctx.checkpoint < START_CHECKPOINT ? START_CHECKPOINT : ctx.checkpoint
//     poolTemplate.bind({ objectId: pool_id, startCheckpoint }, ctx)
//   }
// })

usdPools.magma.forEach((poolId) =>
  SuiObjectProcessor.bind({ objectId: poolId, startCheckpoint: START_CHECKPOINT }).onTimeInterval(
    async (self, objects, ctx) => {
      const { coin_a, coin_b } = self.fields as unknown as pool.Pool<any, any>
      const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
      if (symbol_a.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_a,
          amount: BigInt(coin_a).scaleDown(decimal_a),
          platform: 'magma'
        })
      }
      if (symbol_b.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_b,
          amount: BigInt(coin_b).scaleDown(decimal_b),
          platform: 'magma'
        })
      }
    },
    60 * 12,
    60 * 24
  )
)
