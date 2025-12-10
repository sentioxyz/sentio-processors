import { EthContext } from '@sentio/sdk/eth'
import { BorrowEvent, DepositEvent, GearboxPoolProcessor, RepayEvent, WithdrawEvent } from './types/eth/gearboxpool.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'

const project = 'gearbox'

const pools = [
  '0x6B343F7B797f1488AA48C49d540690F2b2c89751', // USDC
  '0xc4173359087ce643235420b7bc610d9b0cf2b82d', // AUSD
]

pools.forEach((address) => {
  GearboxPoolProcessor.bind({ network, address, startBlock: START_BLOCK })
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
    .onEventRepay(handleEvent, undefined, { transaction: true })
})

function handleEvent(evt: DepositEvent | WithdrawEvent | BorrowEvent | RepayEvent, ctx: EthContext) {
  const distinctId =
    'owner' in evt.args
      ? evt.args.owner
      : 'creditAccount' in evt.args
        ? evt.args.creditAccount
        : ctx.transaction?.from || ''
  recordTx(ctx, distinctId, project)
}
