import { DepositEvent, MuPoolProcessor, WithdrawEvent } from './types/eth/mupool.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'
import { EthContext } from '@sentio/sdk/eth'

const project = 'mu digital'

MuPoolProcessor.bind({
  network,
  address: '0x9c82eb49b51f7dc61e22ff347931ca32adc6cd90',
  startBlock: START_BLOCK,
})
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

function handleEvent(evt: DepositEvent | WithdrawEvent, ctx: EthContext) {
  const distinctId = evt.args.owner
  recordTx(ctx, distinctId, project)
}
