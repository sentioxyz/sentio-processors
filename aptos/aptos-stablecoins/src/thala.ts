import { BigDecimal, Gauge } from '@sentio/sdk'
import { weighted_pool, stable_pool, base_pool } from './types/aptos/thala.js'
import { AptosContext, AptosResourcesProcessor, defaultMoveCoder } from '@sentio/sdk/aptos'
import { getTokenInfoWithFallback } from '@sentio/sdk/aptos/ext'
import { DEFI_START_VERSION, recordSwap, recordTx } from './consts.js'

async function handleEvent(
  evt:
    | weighted_pool.AddLiquidityEventInstance
    | weighted_pool.RemoveLiquidityEventInstance
    | weighted_pool.FlashloanEventInstance
    | stable_pool.AddLiquidityEventInstance
    | stable_pool.RemoveLiquidityEventInstance
    | stable_pool.FlashloanEventInstance,
  ctx: AptosContext
) {
  const [coinX, coinY] = evt.type_arguments
  const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
  if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
    const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
    recordTx(ctx, ctx.transaction.sender, symbol, 'thala')
  }
}

for (const poolProcessor of [weighted_pool, stable_pool]) {
  poolProcessor
    .bind()
    .onEventAddLiquidityEvent(handleEvent)
    .onEventRemoveLiquidityEvent(handleEvent)
    .onEventFlashloanEvent(handleEvent)
    .onEventSwapEvent(async (evt, ctx) => {
      const [coinX, coinY] = evt.type_arguments
      const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
      if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
        const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
        recordTx(ctx, ctx.transaction.sender, symbol, 'thala')
      }
      if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
        recordSwap(ctx, ctx.transaction.sender, infoX.symbol, infoY.symbol, 'thala')
      }
    })
}

AptosResourcesProcessor.bind({
  address: weighted_pool.DEFAULT_OPTIONS.address,
  startVersion: DEFI_START_VERSION
}).onTimeInterval(
  async (resources, ctx) => {
    const pools = await defaultMoveCoder().filterAndDecodeResources<
      weighted_pool.WeightedPool<any, any, any, any, any, any, any, any>
    >(weighted_pool.WeightedPool.TYPE_QNAME, resources)
    console.log('number of thala weighted pools:', pools.length)

    for (const pool of pools) {
      const nullIndex = pool.type_arguments.slice(0, 4).indexOf(base_pool.Null.TYPE_QNAME)
      const numCoins = nullIndex === -1 ? 4 : nullIndex

      const coinTypes = pool.type_arguments.slice(0, numCoins)
      for (let i = 0; i < numCoins; i++) {
        const info = await getTokenInfoWithFallback(coinTypes[i])
        if (info.symbol.includes('USD')) {
          // @ts-expect-error x
          const amount = (pool.data_decoded[`asset_${i}`] as { value: bigint }).value.scaleDown(info.decimals)
          ctx.eventLogger.emit('defi', {
            symbol: info.symbol,
            amount,
            platform: 'thala',
            poolType: pool.type
          })
        }
      }
    }
  },
  60 * 12,
  60 * 24
)

AptosResourcesProcessor.bind({
  address: stable_pool.DEFAULT_OPTIONS.address,
  startVersion: DEFI_START_VERSION
}).onTimeInterval(
  async (resources, ctx) => {
    const pools = await defaultMoveCoder().filterAndDecodeResources<stable_pool.StablePool<any, any, any, any>>(
      stable_pool.StablePool.TYPE_QNAME,
      resources
    )
    console.log('number of thala stable pools:', pools.length)

    for (const pool of pools) {
      const nullIndex = pool.type_arguments.slice(0, 4).indexOf(base_pool.Null.TYPE_QNAME)
      const numCoins = nullIndex === -1 ? 4 : nullIndex

      const coinTypes = pool.type_arguments.slice(0, numCoins)
      for (let i = 0; i < numCoins; i++) {
        const info = await getTokenInfoWithFallback(coinTypes[i])
        // @ts-expect-error x
        const amount = (pool.data_decoded[`asset_${i}`] as { value: bigint }).value.scaleDown(info.decimals)
        if (info.symbol.includes('USD')) {
          ctx.eventLogger.emit('defi', {
            symbol: info.symbol,
            amount,
            platform: 'thala',
            poolType: pool.type
          })
        }
      }
    }
  },
  60 * 12,
  60 * 24
)
