import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'
import { pool, trade, create_pool, liquidity } from './types/sui/momentum.js'
import { SuiContext, SuiObjectProcessor, SuiObjectProcessorTemplate } from '@sentio/sdk/sui'
import { START_CHECKPOINT, getPoolInfo, recordTx, recordSwap } from './utils.js'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { usdPools } from './pools.js'

async function handleEvent(
  evt:
    | liquidity.AddLiquidityEventInstance
    | liquidity.RemoveLiquidityEventInstance
    | liquidity.OpenPositionEventInstance
    | trade.FlashLoanEventInstance
    | trade.RepayFlashLoanEventInstance
    | trade.RepayFlashSwapEventInstance,
  // | liquidity.ClosePositionEventInstance,
  ctx: SuiContext
) {
  const { sender, pool_id } = evt.data_decoded
  const { symbol_a, symbol_b } = await getPoolInfo(ctx, pool_id)
  if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
    const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
    recordTx(ctx, sender, symbol, 'momentum')
  }
}

liquidity
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventAddLiquidityEvent(handleEvent)
  .onEventRemoveLiquidityEvent(handleEvent)
  .onEventOpenPositionEvent(handleEvent)
// .onEventClosePositionEvent(handleEvent)

trade
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventFlashLoanEvent(handleEvent)
  .onEventRepayFlashLoanEvent(handleEvent)
  .onEventRepayFlashSwapEvent(handleEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const { sender, pool_id, x_for_y, amount_x, amount_y } = evt.data_decoded
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, pool_id)
    if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
      const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
      recordTx(ctx, sender, symbol, 'momentum')
    }
    if (symbol_a.includes('USD') && symbol_b.includes('USD')) {
      const pair = x_for_y ? `${symbol_a}-${symbol_b}` : `${symbol_b}-${symbol_a}`
      recordSwap(ctx, sender, pair, decimal_a, decimal_b, amount_x, amount_y, 'momentum')
    }
  })

const poolTemplate = new SuiObjectProcessorTemplate().onTimeInterval(
  async (self, objects, ctx) => {
    const { reserve_x, reserve_y } = self.fields as unknown as pool.Pool<any, any>
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
    if (symbol_a.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_a,
        amount: BigInt(reserve_x).scaleDown(decimal_a),
        platform: 'momentum'
      })
    }
    if (symbol_b.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_b,
        amount: BigInt(reserve_y).scaleDown(decimal_b),
        platform: 'momentum'
      })
    }
  },
  60 * 12,
  60 * 24
)

// create_pool.bind().onEventPoolCreatedEvent(async (evt, ctx) => {
//   const { pool_id, type_x, type_y } = evt.data_decoded
//   console.log('new momentum pool', pool_id, type_x, type_y)
//   const [infoX, infoY] = await Promise.all([
//     getCoinInfoWithFallback('0x' + type_x.name),
//     getCoinInfoWithFallback('0x' + type_y.name)
//   ])
//   if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
//     const startCheckpoint = ctx.checkpoint < START_CHECKPOINT ? START_CHECKPOINT : ctx.checkpoint
//     poolTemplate.bind({ objectId: pool_id, startCheckpoint }, ctx)
//   }
// })

usdPools.momentum.forEach((poolId) =>
  SuiObjectProcessor.bind({ objectId: poolId, startCheckpoint: START_CHECKPOINT }).onTimeInterval(
    async (self, objects, ctx) => {
      const { reserve_x, reserve_y } = self.fields as unknown as pool.Pool<any, any>
      const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
      if (symbol_a.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_a,
          amount: BigInt(reserve_x).scaleDown(decimal_a),
          platform: 'momentum'
        })
      }
      if (symbol_b.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_b,
          amount: BigInt(reserve_y).scaleDown(decimal_b),
          platform: 'momentum'
        })
      }
    },
    60 * 12,
    60 * 24
  )
)
