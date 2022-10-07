import { conversion } from '@sentio/sdk/lib/utils'
import { ERC20Context, ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { COMMITMENT_POOL_GOERLI_MTT, COMMITMENT_POOL_GOERLI_MUSD, GOERLO_BRIDGE_LIST, MTT_GOERLI, MUSD_GOERLI } from './constant'
import { CommitmentIncludedEvent, CommitmentPoolContext, CommitmentPoolProcessor, CommitmentQueuedEvent, CommitmentSpentEvent } from './types/commitmentpool'
import { BigDecimal } from '@sentio/sdk';
import { CommitmentCrossChainEvent, MystikoV2BridgeContext, MystikoV2BridgeProcessor } from './types/mystikov2bridge';

const mttBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = conversion.toBigDecimal((await ctx.contract.balanceOf(COMMITMENT_POOL_GOERLI_MTT))).div(BigDecimal(10).pow(18))
  ctx.meter.Gauge('mtt_balance').record(balance)
}

const mUsdBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = conversion.toBigDecimal((await ctx.contract.balanceOf(COMMITMENT_POOL_GOERLI_MUSD)))
  ctx.meter.Gauge('musd_balance').record(balance)
}

const commitmentQueuedMtt = async function (event: CommitmentQueuedEvent, ctx: CommitmentPoolContext) {
  const rollUpFee = conversion.toBigDecimal(event.args.rollupFee).div(BigDecimal(10).pow(18))
  ctx.meter.Gauge('rollup_fee').record(rollUpFee, {pool: "MTT"})
  ctx.meter.Gauge('rollup_fee_occur').record(1, {pool: "MTT"})
  ctx.meter.Counter('rollup_fee_counter').add(1, {pool: "MTT"})
}

const commitmentQueuedMusd = async function (event: CommitmentQueuedEvent, ctx: CommitmentPoolContext) {
  const rollUpFee = conversion.toBigDecimal(event.args.rollupFee)
  ctx.meter.Gauge('rollup_fee').record(rollUpFee, {pool: "mUSD"})
  ctx.meter.Gauge('rollup_fee_occur').record(1, {pool: "mUSD"})
  ctx.meter.Counter('rollup_fee_counter').add(1, {pool: "mUSD"})

}

const commitmentIncludedMtt = async function (event: CommitmentIncludedEvent, ctx: CommitmentPoolContext) {
  ctx.meter.Counter('included_count').add(1, {pool: "MTT"})
}

const commitmentIncludedMusd = async function (event: CommitmentIncludedEvent, ctx: CommitmentPoolContext) {
  ctx.meter.Counter('included_count').add(1, {pool: "mUSD"})
}

const commitmentSpentMtt = async function (event: CommitmentSpentEvent, ctx: CommitmentPoolContext) {
  ctx.meter.Counter('spent_count').add(1, {pool: "MTT"})
}

const commitmentSpentMusd = async function (event: CommitmentSpentEvent, ctx: CommitmentPoolContext) {
  ctx.meter.Counter('spent_count').add(1, {pool: "mUSD"})
}

const commitmentCrossChain = async function (event: CommitmentCrossChainEvent, ctx: MystikoV2BridgeContext) {
  ctx.meter.Counter('deposit_count').add(1, {from: "goerli"})
}

ERC20Processor.bind({address: MTT_GOERLI, network: 5})
.onBlock(mttBalanceProcessor)

CommitmentPoolProcessor.bind({address: COMMITMENT_POOL_GOERLI_MTT, network: 5})
.onEventCommitmentQueued(commitmentQueuedMtt)
.onEventCommitmentSpent(commitmentSpentMtt)
.onEventCommitmentIncluded(commitmentIncludedMtt)

ERC20Processor.bind({address: MUSD_GOERLI, network: 5})
.onBlock(mUsdBalanceProcessor)

CommitmentPoolProcessor.bind({address: COMMITMENT_POOL_GOERLI_MUSD, network: 5})
.onEventCommitmentQueued(commitmentQueuedMusd)
.onEventCommitmentSpent(commitmentSpentMusd)
.onEventCommitmentIncluded(commitmentIncludedMusd)

for (var i = 0; i < GOERLO_BRIDGE_LIST.length; i++) {
  MystikoV2BridgeProcessor.bind({address: GOERLO_BRIDGE_LIST[i], network: 5})
  .onEventCommitmentCrossChain(commitmentCrossChain)
}