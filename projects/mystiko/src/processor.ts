import { toBigDecimal } from '@sentio/sdk/lib/utils'
import { ERC20Context, ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { COMMITMENT_POOL_GOERLI, MTT_GOERLI } from './constant'
import { CommitmentPoolContext, CommitmentPoolProcessor, CommitmentQueuedEvent } from './types/commitmentpool'

const mttBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = toBigDecimal((await ctx.contract.balanceOf(COMMITMENT_POOL_GOERLI))).div(10**18)
  ctx.meter.Gauge('mtt_balance').record(balance)
}

const commitmentQueued = async function (event: CommitmentQueuedEvent, ctx: CommitmentPoolContext) {
  const rollUpFee = event.args.rollupFee
  ctx.meter.Gauge('rollup_fee').record(rollUpFee)

}

ERC20Processor.bind({address: MTT_GOERLI, network: 5})
.onBlock(mttBalanceProcessor)

CommitmentPoolProcessor.bind({address: COMMITMENT_POOL_GOERLI, network: 5})
.onEventCommitmentQueued(commitmentQueued)