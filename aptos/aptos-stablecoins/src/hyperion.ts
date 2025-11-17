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

const poolAddresses = [
  '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127', // USDt-USDC
  '0x925660b8618394809f89f8002e2926600c775221f43bf1919782b297a79400d8', // APT-USDC
  '0x1609a6f6e914e60bf958d0e1ba24a471ee2bcadeca9e72659336a1f002be50db', // USD1-USDC
  '0xff5a013a4676f724714aec0082403fad822972c56348ba08e0405d08e533325e', // xBTC-USDC
  '0xa7bb8c9b3215e29a3e2c2370dcbad9c71816d385e7863170b147243724b2da58', // WBTC-USDC
  '0x18269b1090d668fbbc01902fa6a5ac6e75565d61860ddae636ac89741c883cbc', // APT-USDt
  '0x49a7e5c1cdf5ddcefe77721bc0728c5113ee1fdc2e2e26eaca92f156505d9ba4', // USDt-USDA
  '0x9b4ea015165ccd957d2e9305d1e3d1c088e834dd0c74001338475c2e5345e8e4', // MKL-USDC
  '0x668aa2e246156b7ee2ed131668c9866115d73343f458f1fd026c0e0608bd77e9' // USDC-uniBTC
]

for (const address of poolAddresses) {
  AptosResourcesProcessor.bind({
    address,
    startVersion: DEFI_START_VERSION,
    endVersion: DEFI_START_VERSION
  }).onVersionInterval(
    async (resources, ctx) => {
      const pools = await defaultMoveCoder().filterAndDecodeResources<pool_v3.LiquidityPoolV3>(
        pool_v3.LiquidityPoolV3.TYPE_QNAME,
        resources
      )
      console.log('number of hyperion pools:', pools.length)
      for (const pool of pools) {
        const storeA = pool.data_decoded.token_a_liquidity
        const storeB = pool.data_decoded.token_b_liquidity
        const storeInfoA = (await ctx.getClient().getAccountResource({
          accountAddress: storeA,
          resourceType: fungible_asset.FungibleStore.TYPE_QNAME
        })) as any
        const storeInfoB = (await ctx.getClient().getAccountResource({
          accountAddress: storeB,
          resourceType: fungible_asset.FungibleStore.TYPE_QNAME
        })) as any
        console.log('storeInfo', storeInfoA, storeInfoB)
        const [tokenInfoA, tokenInfoB] = await Promise.all([
          getTokenInfoWithFallback(storeInfoA.metadata.inner),
          getTokenInfoWithFallback(storeInfoB.metadata.inner)
        ])
        if (tokenInfoA.symbol.includes('USD')) {
          template.bind({ address: storeA, startVersion: ctx.version }, ctx)
        }
        if (tokenInfoB.symbol.includes('USD')) {
          template.bind({ address: storeB, startVersion: ctx.version }, ctx)
        }
      }
    },
    undefined,
    undefined,
    pool_v3.LiquidityPoolV3.TYPE_QNAME
  )
}

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

// pool_v3.bind().onEventCreatePoolEvent(async (evt, ctx) => {
//   const { token_a, token_b, pool } = evt.data_decoded
//   const poolInfo = (await ctx.getClient().getAccountResource({
//     accountAddress: pool,
//     resourceType: pool_v3.LiquidityPoolV3.TYPE_QNAME
//   })) as any
//   const [infoA, infoB] = await Promise.all([getTokenInfoWithFallback(token_a), getTokenInfoWithFallback(token_b)])
//   const storeA = poolInfo.token_a_liquidity.inner
//   const storeB = poolInfo.token_b_liquidity.inner
//   console.log('new hyperion pool', pool, storeA, storeB)
//   let _ctx = ctx as any
//   _ctx.timestampInMicros = new Date(ctx.transaction.timestamp).valueOf()
//   const startVersion = ctx.version < DEFI_START_VERSION ? DEFI_START_VERSION : ctx.version
//   console.log('- startVersion', ctx.version, startVersion)
//   if (infoA.symbol.includes('USD')) {
//     template.bind({ address: storeA, startVersion }, _ctx)
//   }
//   if (infoB.symbol.includes('USD')) {
//     template.bind({ address: storeB, startVersion }, _ctx)
//   }
// })

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
