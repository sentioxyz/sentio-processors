import { ContractContext, EthContext, RichBlock } from '@sentio/sdk/eth'
import {
  BorrowEvent,
  MintEvent,
  RedeemEvent,
  RepayBorrowEvent,
  VenusPool,
  VenusPoolBoundContractView,
  VenusPoolContext,
  VenusPoolProcessor,
} from './types/eth/venuspool.js'
import { network, recordTx, START_BLOCK } from './utils.js'
import { token } from '@sentio/sdk/utils'

const pools = [
  '0xfD5840Cd36d94D7229439859C0112a4185BC0255', // USDT
  '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8', // USDC
  '0xC4eF4229FEc74Ccfe17B2bdeF7715fAC740BA0ba', // FDUSD
]

interface PoolInfo {
  decimals: bigint
  underlying: token.TokenInfo
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx: ContractContext<VenusPool, VenusPoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [decimals, underlying] = await Promise.all([ctx.contract.decimals(), ctx.contract.underlying()])
  const info = await token.getERC20TokenInfo(ctx, underlying)
  return {
    decimals,
    underlying: info,
  }
}

export const getPoolInfo = async function (
  ctx: ContractContext<VenusPool, VenusPoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  let infoPromise = poolInfoMap.get(pool)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx, pool)
    poolInfoMap.set(pool, infoPromise)
    console.log('set poolInfoMap for ' + pool)
  }
  return await infoPromise
}

function handleEvent(evt: MintEvent | RedeemEvent | BorrowEvent | RepayBorrowEvent, ctx: VenusPoolContext) {
  let distintId
  if ('minter' in evt.args) {
    distintId = evt.args.minter
  }
  if ('redeemer' in evt.args) {
    distintId = evt.args.redeemer
  }
  if ('borrower' in evt.args) {
    distintId = evt.args.borrower
  }
  if ('payer' in evt.args) {
    distintId = evt.args.payer
  }
  if (distintId) {
    recordTx(ctx, distintId, 'venus')
  }
}

pools.forEach((address) => {
  VenusPoolProcessor.bind({ network, address, startBlock: START_BLOCK })
    .onTimeInterval(
      async (block, ctx) => {
        const { decimals, underlying } = await getPoolInfo(ctx, ctx.address)
        const [exchangeRateStored, totalSupply] = await Promise.all([
          ctx.contract.exchangeRateStored(),
          ctx.contract.totalSupply(),
        ])
        const amount = totalSupply
          .scaleDown(decimals)
          // .multipliedBy(exchangeRateStored.scaleDown(decimals + BigInt(underlying.decimal)))
          .multipliedBy(exchangeRateStored.scaleDown(10 + underlying.decimal))
        ctx.eventLogger.emit('defi', {
          symbol: underlying.symbol,
          amount,
          platform: 'venus',
        })
      },
      60 * 12,
      60 * 24,
    )
    .onEventMint(handleEvent)
    .onEventRedeem(handleEvent)
    .onEventBorrow(handleEvent)
    .onEventRepayBorrow(handleEvent)
    .onEventTransfer(
      (evt, ctx) => {
        const distinctId = ctx.transaction?.from
        if (distinctId) {
          recordTx(ctx, distinctId, 'venus')
        }
      },
      undefined,
      { transaction: true },
    )
})
