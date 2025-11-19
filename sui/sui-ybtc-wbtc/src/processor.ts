import { sui_system, validator } from '@sentio/sdk/sui/builtin/0x3'
import { SuiNetwork, SuiObjectProcessor, BUILTIN_TYPES, SuiObjectContext, SuiContext } from '@sentio/sdk/sui'
import { pool as TurbosPool } from './types/sui/turbos.js'
import { pool as MomentumPool, trade } from './types/sui/momentum.js'
import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'
import { getPriceBySymbol } from '@sentio/sdk/utils'
import { BigDecimal } from '@sentio/sdk'
import { getPoolCoins, getPoolInfo, recordTx } from './utils.js'

const poolAddresses = {
  turbos: '0xf1b9b42430189a701d303ad3a222129c13a6b4bfd2e8117138adc572e4b95722',
  momentum: '0x16b26200e28fa32150f9d1bd8a329e781f6827e0ca420feaa5592dfd072b704c'
}

// const startCheckpoint = 213450000n
const startCheckpoint = 203000000n

TurbosPool.bind({ startCheckpoint })
  .onEventMintEvent(handleTurbosEvent)
  .onEventBurnEvent(handleTurbosEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const { pool, recipient, amount_a, amount_b, a_to_b } = evt.data_decoded
    if (pool != poolAddresses.turbos) {
      return
    }
    await handleSwapEvent(ctx, pool, recipient, amount_a, amount_b, a_to_b, 'turbos')
  })

trade
  .bind({ startCheckpoint })
  .onEventFlashLoanEvent(handleMomentumEvent)
  .onEventRepayFlashLoanEvent(handleMomentumEvent)
  .onEventSwapEvent(async (evt, ctx) => {
    const { sender, pool_id, x_for_y, amount_x, amount_y } = evt.data_decoded
    if (pool_id != poolAddresses.momentum) {
      return
    }
    await handleSwapEvent(ctx, pool_id, sender, amount_x, amount_y, x_for_y, 'momentum')
  })

SuiObjectProcessor.bind({
  objectId: poolAddresses.turbos,
  startCheckpoint
}).onTimeInterval(
  async (self, objects, ctx) => {
    const { coin_a, coin_b } = self.fields as unknown as TurbosPool.Pool<any, any, any>
    await handlePoolTvl(ctx, self.type, coin_a, coin_b, 'turbos')
  },
  60 * 12,
  60 * 24
)

SuiObjectProcessor.bind({
  objectId: poolAddresses.momentum,
  startCheckpoint
}).onTimeInterval(
  async (self, objects, ctx) => {
    const { reserve_x, reserve_y } = self.fields as unknown as MomentumPool.Pool<any, any>
    await handlePoolTvl(ctx, self.type, reserve_x, reserve_y, 'momentum')
  },
  60 * 12,
  60 * 24
)

async function handleTurbosEvent(evt: TurbosPool.MintEventInstance | TurbosPool.BurnEventInstance, ctx: SuiContext) {
  const { pool, owner } = evt.data_decoded
  if (pool != poolAddresses.turbos) {
    return
  }
  recordTx(ctx, owner, 'turbos')
}

async function handleMomentumEvent(
  evt: trade.FlashLoanEventInstance | trade.RepayFlashLoanEventInstance,
  ctx: SuiContext
) {
  const { pool_id, sender } = evt.data_decoded
  if (pool_id != poolAddresses.momentum) {
    return
  }
  recordTx(ctx, sender, 'momentum')
}

async function handleSwapEvent(
  ctx: SuiContext,
  pool: string,
  distinctId: string,
  amountA: bigint,
  amountB: bigint,
  atob: boolean,
  project: string
) {
  const { symbol_a, symbol_b, decimal_a, decimal_b } = await getPoolInfo(ctx, pool)
  let amount = BigDecimal(0)
  if (atob) {
    const price = await getPriceBySymbol(symbol_a, ctx.timestamp)
    if (price) {
      amount = BigInt(amountA).scaleDown(decimal_a).multipliedBy(price)
    }
  } else {
    const price = await getPriceBySymbol(symbol_b, ctx.timestamp)
    if (price) {
      amount = BigInt(amountB).scaleDown(decimal_b).multipliedBy(price)
    }
  }
  ctx.eventLogger.emit('swap', {
    distinctId,
    amount,
    project
  })
  recordTx(ctx, distinctId, project)
}

async function handlePoolTvl(ctx: SuiObjectContext, type: string, amountA: bigint, amountB: bigint, project: string) {
  const [addressA, addressB] = getPoolCoins(type)
  const [infoA, infoB] = await Promise.all([getCoinInfoWithFallback(addressA), getCoinInfoWithFallback(addressB)])
  const [priceA, priceB] = await Promise.all([
    getPriceBySymbol(infoA.symbol, ctx.timestamp),
    getPriceBySymbol(infoB.symbol, ctx.timestamp)
  ])
  let amount = BigDecimal(0)
  if (priceA) {
    amount = BigInt(amountA).scaleDown(infoA.decimals).multipliedBy(priceA)
  }
  if (priceB) {
    amount = amount.plus(BigInt(amountB).scaleDown(infoB.decimals).multipliedBy(priceB))
  }
  ctx.eventLogger.emit('tvl', {
    amount,
    project
  })
}
