import { SuiContext, SuiObjectProcessor, SuiObjectProcessorTemplate } from '@sentio/sdk/sui'
import { events, pool } from './types/sui/bluefin.js'
import { START_CHECKPOINT, getPoolInfo, recordTx, recordSwap } from './utils.js'
import { usdPools } from './pools.js'

async function handleEvent(evt: events.LiquidityProvidedInstance | events.PositionOpenedInstance, ctx: SuiContext) {
  const { pool_id } = evt.data_decoded
  const { symbol_a, symbol_b } = await getPoolInfo(ctx, pool_id)
  if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
    const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
    recordTx(ctx, evt.sender, symbol, 'bluefin')
  }
}

async function handleSwapEvent(evt: events.AssetSwapInstance, ctx: SuiContext) {
  const { pool_id, amount_in, amount_out, a2b } = evt.data_decoded
  const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, pool_id)
  if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
    const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
    recordTx(ctx, evt.sender, symbol, 'bluefin')
  }
  if (symbol_a.includes('USD') && symbol_b.includes('USD')) {
    const pair = a2b ? `${symbol_a}-${symbol_b}` : `${symbol_b}-${symbol_a}`
    recordSwap(ctx, evt.sender, pair, decimal_a, decimal_b, amount_in, amount_out, 'bluefin')
  }
}

events
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventLiquidityProvided(handleEvent)
  .onEventLiquidityRemoved(handleEvent)
  .onEventPositionOpened(handleEvent)
  .onEventPositionClosed(handleEvent)
  .onEventAssetSwap(handleSwapEvent)
  .onEventFlashSwap(handleSwapEvent)

// events.bind().onEventPoolCreated(async (evt, ctx) => {
//   const { id, coin_a_symbol, coin_b_symbol } = evt.data_decoded
//   console.log('new bluefin pool', id, coin_a_symbol, coin_b_symbol)
//   if (coin_a_symbol.includes('USD') || coin_b_symbol.includes('USD')) {
//     const startCheckpoint = ctx.checkpoint < START_CHECKPOINT ? START_CHECKPOINT : ctx.checkpoint
//     poolTemplate.bind({ objectId: id, startCheckpoint }, ctx)
//   }
// })

const poolTemplate = new SuiObjectProcessorTemplate().onTimeInterval(
  async (self, objects, ctx) => {
    const { coin_a, coin_b } = self.fields as unknown as pool.Pool<any, any>
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
    if (symbol_a.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_a,
        amount: BigInt(coin_a).scaleDown(decimal_a),
        platform: 'bluefin'
      })
    }
    if (symbol_b.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_b,
        amount: BigInt(coin_b).scaleDown(decimal_b),
        platform: 'bluefin'
      })
    }
  },
  60 * 12,
  60 * 24
)

usdPools.bluefin.forEach((poolId) =>
  SuiObjectProcessor.bind({ objectId: poolId, startCheckpoint: START_CHECKPOINT }).onTimeInterval(
    async (self, objects, ctx) => {
      const { coin_a, coin_b } = self.fields as unknown as pool.Pool<any, any>
      const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
      if (symbol_a.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_a,
          amount: BigInt(coin_a).scaleDown(decimal_a),
          platform: 'bluefin'
        })
      }
      if (symbol_b.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_b,
          amount: BigInt(coin_b).scaleDown(decimal_b),
          platform: 'bluefin'
        })
      }
    },
    60 * 12,
    60 * 24
  )
)
