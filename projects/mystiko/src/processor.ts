import { toBigDecimal } from '@sentio/sdk/lib/utils'
import { ERC20Context, ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { COMMITMENT_POOL_GOERLI_MTT, COMMITMENT_POOL_GOERLI_MUSD, MTT_GOERLI, MUSD_GOERLI } from './constant'
import { CommitmentPoolContext, CommitmentPoolProcessor, CommitmentQueuedEvent } from './types/commitmentpool'
import { BigDecimal } from '@sentio/sdk';

const mttBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = toBigDecimal((await ctx.contract.balanceOf(COMMITMENT_POOL_GOERLI_MTT))).div(BigDecimal(10).pow(18))
  ctx.meter.Gauge('mtt_balance').record(balance)
}

const mUsdBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = toBigDecimal((await ctx.contract.balanceOf(COMMITMENT_POOL_GOERLI_MUSD)))
  ctx.meter.Gauge('musd_balance').record(balance)
}

const commitmentQueuedMtt = async function (event: CommitmentQueuedEvent, ctx: CommitmentPoolContext) {
  const rollUpFee = toBigDecimal(event.args.rollupFee).div(BigDecimal(10).pow(18))
  ctx.meter.Gauge('rollup_fee_mtt').record(rollUpFee)
  ctx.meter.Counter('debug_counter').add(1)
}

const commitmentQueuedMusd = async function (event: CommitmentQueuedEvent, ctx: CommitmentPoolContext) {
  const rollUpFee = toBigDecimal(event.args.rollupFee)
  ctx.meter.Gauge('rollup_fee_musd').record(rollUpFee)
}

ERC20Processor.bind({address: MTT_GOERLI, network: 5})
.onBlock(mttBalanceProcessor)

CommitmentPoolProcessor.bind({address: COMMITMENT_POOL_GOERLI_MTT, network: 5})
.onEventCommitmentQueued(commitmentQueuedMtt)

ERC20Processor.bind({address: MUSD_GOERLI, network: 5})
.onBlock(mUsdBalanceProcessor)

CommitmentPoolProcessor.bind({address: COMMITMENT_POOL_GOERLI_MUSD, network: 5})
.onEventCommitmentQueued(commitmentQueuedMusd)