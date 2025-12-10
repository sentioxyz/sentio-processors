import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { EulerFactoryProcessor } from './types/eth/eulerfactory.js'
import {
  BorrowEvent,
  DepositEvent,
  EulerVaultProcessor,
  EulerVaultProcessorTemplate,
  getEulerVaultContractOnContext,
  RepayEvent,
  WithdrawEvent,
} from './types/eth/eulervault.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'
import { EthContext } from '@sentio/sdk/eth'

const project = 'euler'

const template = new EulerVaultProcessorTemplate()
  .onTimeInterval(
    async (block, ctx) => {
      const [asset, totalAssets] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
      await Promise.all([recordTvl(ctx, asset, totalAssets, ctx.address, project)])
    },
    60 * 12,
    60 * 24,
  )
  .onEventDeposit(handleEvent)
  .onEventWithdraw(handleEvent)
  .onEventBorrow(handleEvent)
  .onEventRepay(handleEvent)

EulerFactoryProcessor.bind({ network, address: '0xba4Dd672062dE8FeeDb665DD4410658864483f1E' }).onEventProxyCreated(
  async (evt, ctx) => {
    const pool = '0x' + evt.topics[1].slice(-40)
    const contract = getEulerVaultContractOnContext(ctx, pool)
    const asset = await contract.asset()
    try {
      const symbol = await getERC20ContractOnContext(ctx, asset).symbol()
      const price = await getPriceBySymbol(symbol, ctx.timestamp)
      if (price) {
        const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
        template.bind({ address: pool, startBlock }, ctx)
      }
    } catch (e) {}
  },
)

function handleEvent(evt: DepositEvent | WithdrawEvent | BorrowEvent | RepayEvent, ctx: EthContext) {
  const distinctId = 'owner' in evt.args ? evt.args.owner : evt.args.account
  recordTx(ctx, distinctId, project)
}
