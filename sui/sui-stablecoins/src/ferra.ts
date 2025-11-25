import { SuiContext, SuiObjectProcessor, SuiObjectProcessorTemplate } from '@sentio/sdk/sui'
import { lb_pair, lb_factory } from './types/sui/ferra.js'
import { getPoolInfo, START_CHECKPOINT, recordTx, recordSwap } from './utils.js'
import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'
import { usdPools } from './pools.js'

async function handleEvent(
  evt:
    | lb_pair.AddLiquidityEventInstance
    | lb_pair.RemoveLiquidityEventInstance
    | lb_pair.OpenPositionEventInstance
    | lb_pair.ClosePositionEventInstance,
  ctx: SuiContext
) {
  const { pair } = evt.data_decoded
  const { symbol_a, symbol_b } = await getPoolInfo(ctx, pair)
  if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
    const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
    recordTx(ctx, evt.sender, symbol, 'ferra')
  }
}

function sum(arr: bigint[]) {
  return arr.reduce((acc, cur) => acc + cur, 0n)
}

lb_pair
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventAddLiquidityEvent(handleEvent)
  .onEventRemoveLiquidityEvent(handleEvent)
  .onEventOpenPositionEvent(handleEvent)
  .onEventClosePositionEvent(handleEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const { pair, amounts_in_x, amounts_in_y, amounts_out_x, amounts_out_y, swap_for_y } = evt.data_decoded
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, pair)
    if (symbol_a.includes('USD') || symbol_b.includes('USD')) {
      const symbol = symbol_a.includes('USD') ? symbol_a : symbol_b
      recordTx(ctx, evt.sender, symbol, 'ferra')
    }
    if (symbol_a.includes('USD') && symbol_b.includes('USD')) {
      const pair = swap_for_y ? `${symbol_a}-${symbol_b}` : `${symbol_b}-${symbol_a}`
      recordSwap(
        ctx,
        evt.sender,
        pair,
        decimal_a,
        decimal_b,
        sum(amounts_in_x) + sum(amounts_out_x),
        sum(amounts_in_y) + sum(amounts_out_y),
        'ferra'
      )
    }
  })

const poolTemplate = new SuiObjectProcessorTemplate().onTimeInterval(
  async (self, objects, ctx) => {
    const { balance_x, balance_y } = self.fields as unknown as lb_pair.LBPair<any, any>
    const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
    if (symbol_a.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_a,
        amount: BigInt(balance_x).scaleDown(decimal_a),
        platform: 'ferra'
      })
    }
    if (symbol_b.includes('USD')) {
      ctx.eventLogger.emit('defi', {
        symbol: symbol_b,
        amount: BigInt(balance_y).scaleDown(decimal_b),
        platform: 'ferra'
      })
    }
  },
  60 * 12,
  60 * 24
)

// lb_factory.bind().onEventCreatePairEvent(async (evt, ctx) => {
//   const { pair_id, coin_type_a, coin_type_b } = evt.data_decoded
//   console.log('new ferra pool', pair_id, coin_type_a, coin_type_b)
//   const [infoX, infoY] = await Promise.all([getCoinInfoWithFallback(coin_type_a), getCoinInfoWithFallback(coin_type_b)])
//   if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
//     const startCheckpoint = ctx.checkpoint < START_CHECKPOINT ? START_CHECKPOINT : ctx.checkpoint
//     poolTemplate.bind({ objectId: pair_id, startCheckpoint }, ctx)
//   }
// })

usdPools.ferra.forEach((poolId) =>
  SuiObjectProcessor.bind({ objectId: poolId, startCheckpoint: START_CHECKPOINT }).onTimeInterval(
    async (self, objects, ctx) => {
      const { balance_x, balance_y } = self.fields as unknown as lb_pair.LBPair<any, any>
      const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, ctx.address)
      if (symbol_a.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_a,
          amount: BigInt(balance_x).scaleDown(decimal_a),
          platform: 'ferra'
        })
      }
      if (symbol_b.includes('USD')) {
        ctx.eventLogger.emit('defi', {
          symbol: symbol_b,
          amount: BigInt(balance_y).scaleDown(decimal_b),
          platform: 'ferra'
        })
      }
    },
    60 * 12,
    60 * 24
  )
)
