import { ContractContext, EthContext } from '@sentio/sdk/eth'
import {
  CurvanceMarketManager,
  CurvanceMarketManagerBoundContractView,
  CurvanceMarketManagerProcessor,
} from './types/eth/curvancemarketmanager.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'
import { getCurvanceBorrowableCTokenContractOnContext } from './types/eth/curvanceborrowablectoken.js'

const project = 'curvance'

interface PoolInfo {
  tokenX: string
  tokenY: string
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx: ContractContext<CurvanceMarketManager, CurvanceMarketManagerBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [tokenX, tokenY] = await Promise.all([ctx.contract.tokensListed(0), ctx.contract.tokensListed(1)])
  return {
    tokenX,
    tokenY,
  }
}

export const getPoolInfo = async function (
  ctx: ContractContext<CurvanceMarketManager, CurvanceMarketManagerBoundContractView>,
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

const managers = [
  '0x830D40CDFdc494BC1A2729a7381bfCe44326c944',
  '0x7C822B093A116654F824Ec2A35CD23a3749E4f90',
  '0x83840d837E7A3E00bBb0B8501E60E989A8987c37',
  '0xE1C24B2E93230FBe33d32Ba38ECA3218284143e2',
  '0x5EA0a1Cf3501C954b64902c5e92100b8A2CaB1Ac',
  '0xe5970cDB1916B2cCF6185C86C174EEE2d330D05B',
  '0xBBE7A3c45aDBb16F6490767b663428c34aA341Eb',
  '0xd6365555f6a697C7C295bA741100AA644cE28545',
  '0x05e70717fA8BD0F21a9F826d093d99f6Da4f1554',
  '0xa6A2A92F126b79Ee0804845ee6B52899b4491093',
  '0x01C4a0d396EFE982B1B103BE9910321d34e1aEA9',
  '0xb3E9E0134354cc91b7FB9F9d6C3ab0dE7854BB49',
  '0xb00aFF53a4Df2b4E2f97a3d9ffaDb55564C8E42F',
]

managers.forEach((address) => {
  CurvanceMarketManagerProcessor.bind({ network, address, startBlock: START_BLOCK })
    .onTimeInterval(
      async (block, ctx) => {
        const { tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
        await Promise.all([recordCurvanceTvl(ctx, tokenX, 'x'), recordCurvanceTvl(ctx, tokenY, 'y')])
      },
      60 * 12,
      60 * 24,
    )
    .onEventPositionUpdated((evt, ctx) => {
      const { account } = evt.args
      recordTx(ctx, account, project)
    })
})

async function recordCurvanceTvl(ctx: EthContext, token: string, label: 'x' | 'y') {
  const contract = getCurvanceBorrowableCTokenContractOnContext(ctx, token)
  const [asset, totalAssets] = await Promise.all([contract.asset(), contract.totalAssets()])
  await recordTvl(ctx, asset, totalAssets, `${ctx.address}.${label}`, project)
}
