import { AptosContext, AptosResourcesProcessor, defaultMoveCoder } from '@sentio/sdk/aptos'
import * as v0 from './types/aptos/liquidswap_v0.js'
import * as v05 from './types/aptos/liquidswap_v0_5.js'
import { pool } from './types/aptos/liquidswap_v1.js'
import { DEFI_START_VERSION, recordSwap, recordTx } from './consts.js'
import { getTokenInfoWithFallback, TokenInfo } from '@sentio/sdk/aptos/ext'

const resourceAddress_v0 = '0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948'
const resourceAddress_v05 = '0x61d2c22a6cb7831bee0f48363b0eec92369357aece0d1142062f7d5d85c7bef8'
const resourceAddress_v1 = '0xa0d8702b7c696d989675cd2f894f44e79361531cff115c0063390922f5463883'

type PoolType<T0, T1, T2> = v0.liquidity_pool.LiquidityPool<T0, T1, T2> | v05.liquidity_pool.LiquidityPool<T0, T1, T2>

async function handleEvent(
  evt:
    | v0.liquidity_pool.LiquidityAddedEventInstance
    | v05.liquidity_pool.LiquidityAddedEventInstance
    | v0.liquidity_pool.LiquidityRemovedEventInstance
    | v05.liquidity_pool.LiquidityRemovedEventInstance
    | v0.liquidity_pool.FlashloanEventInstance
    | v05.liquidity_pool.FlashloanEventInstance,
  ctx: AptosContext
) {
  const [coinX, coinY] = evt.type_arguments
  const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
  if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
    const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
    recordTx(ctx, ctx.transaction.sender, symbol, 'liquidswap')
  }
}

for (const env of [v0, v05]) {
  const liquidity_pool = env.liquidity_pool
  const resourceAddress = env == v0 ? resourceAddress_v0 : resourceAddress_v05
  const ver = env == v0 ? 'v0' : 'v0.5'

  liquidity_pool
    .bind()
    .onEventLiquidityAddedEvent(handleEvent)
    .onEventLiquidityRemovedEvent(handleEvent)
    .onEventFlashloanEvent(handleEvent)
    .onEventSwapEvent(async (evt, ctx) => {
      const [coinX, coinY] = evt.type_arguments
      const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
      if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
        const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
        recordTx(ctx, ctx.transaction.sender, symbol, 'liquidswap')
      }
      if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
        recordSwap(ctx, ctx.transaction.sender, infoX.symbol, infoY.symbol, 'liquidswap')
      }
    })

  AptosResourcesProcessor.bind({
    address: resourceAddress,
    startVersion: DEFI_START_VERSION,
    baseLabels: { ver }
  }).onTimeInterval(
    async (resources, ctx) => {
      const pools = await defaultMoveCoder().filterAndDecodeResources<PoolType<any, any, any>>(
        liquidity_pool.LiquidityPool.type(),
        resources
      )
      console.log(`num of liquidswap ${ver} pools:`, pools.length)
      for (const pool of pools) {
        const [coinX, coinY] = pool.type_arguments
        const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
        const amountX = pool.data_decoded.coin_x_reserve.value
        const amountY = pool.data_decoded.coin_y_reserve.value
        const arr: [TokenInfo, bigint][] = [
          [infoX, amountX],
          [infoY, amountY]
        ]
        arr.map(([info, amount]) => {
          if (info.symbol.includes('USD')) {
            ctx.eventLogger.emit('defi', {
              symbol: info.symbol,
              amount: amount.scaleDown(info.decimals),
              platform: 'liquidswap',
              poolType: pool.type,
              ver
            })
          }
        })
      }
    },
    60 * 12,
    60 * 24
  )
}

AptosResourcesProcessor.bind({
  address: resourceAddress_v1,
  startVersion: DEFI_START_VERSION
}).onTimeInterval(
  async (resources, ctx) => {
    const pools = await defaultMoveCoder().filterAndDecodeResources<pool.Pool<any, any, any>>(
      pool.Pool.TYPE_QNAME,
      resources
    )
    console.log('number of liquidswap v1 pools:', pools.length)

    for (const pool of pools) {
      const [coinX, coinY] = pool.type_arguments
      const infoX = await getTokenInfoWithFallback(coinX)
      const infoY = await getTokenInfoWithFallback(coinY)
      if (infoX.symbol.includes('USD')) {
        const amount = pool.data_decoded.coins_x.value.scaleDown(infoX.decimals)
        ctx.eventLogger.emit('defi', {
          symbol: infoX.symbol,
          amount,
          platform: 'liquidswap',
          poolType: pool.type,
          ver: 'v1'
        })
      }
      if (infoY.symbol.includes('USD')) {
        const amount = pool.data_decoded.coins_y.value.scaleDown(infoY.decimals)
        ctx.eventLogger.emit('defi', {
          symbol: infoY.symbol,
          amount,
          platform: 'liquidswap',
          poolType: pool.type,
          ver: 'v1'
        })
      }
    }
  },
  60 * 12,
  60 * 24
)
