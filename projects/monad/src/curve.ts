import { ContractContext, EthContext } from '@sentio/sdk/eth'
import { CurveFactoryProcessor } from './types/eth/curvefactory.js'
import {
  AddLiquidityEvent,
  AddLiquidityEventObject,
  CurvePool,
  CurvePoolBoundContractView,
  CurvePoolProcessorTemplate,
  RemoveLiquidityEvent,
  TokenExchangeEvent,
} from './types/eth/curvepool.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'

const project = 'curve'

interface PoolInfo {
  tokenX: string
  tokenY: string
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx: ContractContext<CurvePool, CurvePoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [tokenX, tokenY] = await Promise.all([ctx.contract.coins(0), ctx.contract.coins(1)])
  return {
    tokenX,
    tokenY,
  }
}

export const getPoolInfo = async function (
  ctx: ContractContext<CurvePool, CurvePoolBoundContractView>,
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

const template = new CurvePoolProcessorTemplate()
  .onTimeInterval(
    async (block, ctx) => {
      const { tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
      const [reserveX, reserveY] = await Promise.all([ctx.contract.balances(0), ctx.contract.balances(1)])
      await Promise.all([
        recordTvl(ctx, tokenX, reserveX, `${ctx.address}.x`, project),
        recordTvl(ctx, tokenX, reserveY, `${ctx.address}.y`, project),
      ])
    },
    60 * 12,
    60 * 24,
  )
  .onEventAddLiquidity(handleEvent)
  .onEventRemoveLiquidity(handleEvent)
  .onEventTokenExchange(handleEvent)

CurveFactoryProcessor.bind({ network, address: '0x8271e06E5887FE5ba05234f5315c19f3Ec90E8aD' }).onEventPlainPoolDeployed(
  async (evt, ctx) => {
    const { pool } = evt.args
    const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
    template.bind({ address: pool, startBlock }, ctx)
  },
)

function handleEvent(evt: AddLiquidityEvent | RemoveLiquidityEvent | TokenExchangeEvent, ctx: EthContext) {
  const distinctId = 'provider' in evt.args ? evt.args.provider : evt.args.buyer
  recordTx(ctx, distinctId, project)
}
