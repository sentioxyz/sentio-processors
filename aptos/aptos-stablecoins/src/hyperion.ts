import { BigDecimal, Gauge } from '@sentio/sdk'
import { pool_v3 } from './types/aptos/hyperion.js'
import {
  AptosContext,
  AptosResourceProcessorTemplate,
  AptosResourcesProcessor,
  defaultMoveCoder
} from '@sentio/sdk/aptos'
import { getTokenInfoWithFallback } from '@sentio/sdk/aptos/ext'
import { DEFI_START_VERSION, recordSwap, recordTx } from './consts.js'
import { fungible_asset } from '@sentio/sdk/aptos/builtin/0x1'

async function handleEvent(
  evt: pool_v3.AddLiquidityEventV3Instance | pool_v3.RemoveLiquidityEventV3Instance,
  ctx: AptosContext
) {
  const { token_a: coinX, token_b: coinY } = evt.data_decoded
  const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
  if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
    const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
    recordTx(ctx, ctx.transaction.sender, symbol, 'hyperion')
  }
}

pool_v3
  .bind({ startVersion: DEFI_START_VERSION })
  .onEventAddLiquidityEventV3(handleEvent)
  .onEventRemoveLiquidityEventV3(handleEvent)
  .onEventSwapEventV3(async (evt, ctx) => {
    const { from_token: coinX, to_token: coinY, amount_in, amount_out } = evt.data_decoded
    const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
    if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
      const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
      recordTx(ctx, ctx.transaction.sender, symbol, 'hyperion')
    }
    if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
      recordSwap(ctx, ctx.transaction.sender, infoX, infoY, amount_in, amount_out, 'hyperion')
    }
  })

const template = new AptosResourceProcessorTemplate().onTimeInterval(
  async (resources, ctx) => {
    const stores = await defaultMoveCoder().filterAndDecodeResources<fungible_asset.FungibleStore>(
      fungible_asset.FungibleStore.TYPE_QNAME,
      resources
    )
    for (const store of stores) {
      const info = await getTokenInfoWithFallback(store.data_decoded.metadata)
      ctx.eventLogger.emit('defi', {
        symbol: info.symbol,
        amount: store.data_decoded.balance.scaleDown(info.decimals),
        platform: 'hyperion'
      })
    }
  },
  60 * 12,
  60 * 24,
  fungible_asset.FungibleStore.TYPE_QNAME
)

pool_v3.bind().onEventCreatePoolEvent(async (evt, ctx) => {
  const { token_a, token_b, pool } = evt.data_decoded
  const poolInfo = (await ctx.getClient().getAccountResource({
    accountAddress: pool,
    resourceType: pool_v3.LiquidityPoolV3.TYPE_QNAME
  })) as any
  const [infoA, infoB] = await Promise.all([getTokenInfoWithFallback(token_a), getTokenInfoWithFallback(token_b)])
  const storeA = poolInfo.token_a_liquidity.inner
  const storeB = poolInfo.token_b_liquidity.inner
  console.log('new hyperion pool', pool, storeA, storeB)
  let _ctx = ctx as any
  _ctx.timestampInMicros = new Date(ctx.transaction.timestamp).valueOf()
  const startVersion = ctx.version < DEFI_START_VERSION ? DEFI_START_VERSION : ctx.version
  console.log('- startVersion', ctx.version, startVersion)
  if (infoA.symbol.includes('USD')) {
    template.bind({ address: storeA, startVersion }, _ctx)
  }
  if (infoB.symbol.includes('USD')) {
    template.bind({ address: storeB, startVersion }, _ctx)
  }
})

// address: pool_v3.DEFAULT_OPTIONS.address,
// address: '0x4ea3c7d6fd8ee6e752ca70420d4aac1fda379db4475520249faf8e04ad31c5a4',
// AptosResourcesProcessor.bind({
//   address: '*',
//   startVersion: DEFI_START_VERSION
// }).onTimeInterval(
//   async (resources, ctx) => {
//     const pools = await defaultMoveCoder().filterAndDecodeResources<pool_v3.LiquidityPoolV3>(
//       pool_v3.LiquidityPoolV3.TYPE_QNAME,
//       resources
//     )
//     console.log('number of hyperion pools:', pools.length)
//   },
//   60 * 12,
//   60 * 24,
//   '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::pool_v3::LiquidityPoolV3'
// )
