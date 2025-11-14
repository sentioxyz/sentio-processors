import { AptosContext, AptosResourcesProcessor, defaultMoveCoder } from '@sentio/sdk/aptos'
import { controller, reserve } from './types/aptos/aries.js'
import { DEFI_START_VERSION, recordTx, recordSwap } from './consts.js'
import { getTokenInfoWithFallback } from '@sentio/sdk/aptos/ext'

async function handleEvent(
  evt:
    | controller.DepositEventInstance
    | controller.DepositRepayForEventInstance
    | controller.BeginFlashLoanEventInstance
    | controller.EndFlashLoanEventInstance
    | reserve.MintLPEventInstance
    | reserve.RedeemLPEventInstance,
  ctx: AptosContext
) {
  const [coinX, coinY] = evt.type_arguments
  const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
  if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
    const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
    recordTx(ctx, ctx.transaction.sender, symbol, 'aries')
  }
}

controller
  .bind()
  .onEventDepositEvent(handleEvent)
  .onEventDepositRepayForEvent(handleEvent)
  .onEventBeginFlashLoanEvent(handleEvent)
  .onEventEndFlashLoanEvent(handleEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const [coinX, coinY] = evt.type_arguments
    const [infoX, infoY] = await Promise.all([getTokenInfoWithFallback(coinX), getTokenInfoWithFallback(coinY)])
    if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
      const symbol = infoX.symbol.includes('USD') ? infoX.symbol : infoY.symbol
      recordTx(ctx, ctx.transaction.sender, symbol, 'aries')
    }
    if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
      recordSwap(ctx, ctx.transaction.sender, infoX.symbol, infoY.symbol, 'aries')
    }
  })

// reserve.bind().onEventMintLPEvent(handleEvent).onEventRedeemLPEvent(handleEvent)

AptosResourcesProcessor.bind({
  address: reserve.DEFAULT_OPTIONS.address,
  startVersion: DEFI_START_VERSION
}).onTimeInterval(
  async (resources, ctx) => {
    const pools = await defaultMoveCoder().filterAndDecodeResources<reserve.ReserveCoinContainer<any>>(
      reserve.ReserveCoinContainer.TYPE_QNAME,
      resources
    )
    console.log('number of aries reserve containers:', pools.length)

    for (const pool of pools) {
      const coinType = pool.type_arguments[0]
      const info = await getTokenInfoWithFallback(coinType)
      if (info.symbol.includes('USD')) {
        const amount = pool.data_decoded.underlying_coin.value.scaleDown(info.decimals)
        ctx.eventLogger.emit('defi', {
          symbol: info.symbol,
          amount,
          platform: 'aries',
          poolType: pool.type
        })
      }
    }
  },
  60 * 12,
  60 * 24
)
