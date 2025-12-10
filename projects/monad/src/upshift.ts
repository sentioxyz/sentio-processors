import { getPriceBySymbol, token } from '@sentio/sdk/utils'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'
import { DepositEvent, UpshiftVaultProcessor, WithdrawEvent } from './types/eth/upshiftvault.js'
import {
  DepositEvent as DepositEventAccount,
  UpshiftAccountProcessor,
  WithdrawEvent as WithdrawEventAccount,
} from './types/eth/upshiftaccount.js'
import { EthContext } from '@sentio/sdk/eth'

const project = 'upshift'

const vaults = ['0x36eDbF0C834591BFdfCaC0Ef9605528c75c406aA']
const accounts = ['0xD793c04B87386A6bb84ee61D98e0065FdE7fdA5E']

vaults.forEach((address) =>
  UpshiftVaultProcessor.bind({
    network,
    startBlock: START_BLOCK,
    address,
  })
    .onTimeInterval(
      async (block, ctx) => {
        const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.getTotalAssets()])
        await recordTvl(ctx, asset, total, ctx.address, project)
      },
      60 * 12,
      60 * 24,
    )
    .onEventDeposit(handleEvent)
    .onEventWithdraw(handleEvent),
)

accounts.forEach((address) =>
  UpshiftAccountProcessor.bind({
    network,
    startBlock: START_BLOCK,
    address,
  })
    .onTimeInterval(
      async (block, ctx) => {
        const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
        await recordTvl(ctx, asset, total, ctx.address, project)
      },
      60 * 12,
      60 * 24,
    )
    .onEventDeposit(handleEvent)
    .onEventWithdraw(handleEvent),
)

function handleEvent(evt: DepositEvent | WithdrawEvent | DepositEventAccount | WithdrawEventAccount, ctx: EthContext) {
  const distinctId = 'receiverAddr' in evt.args ? evt.args.receiverAddr : evt.args.owner
  recordTx(ctx, distinctId, project)
}
