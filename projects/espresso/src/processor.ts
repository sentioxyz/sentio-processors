import { CapeContext, CapeProcessor, AssetSponsoredEvent, BlockCommittedEvent, FaucetInitializedEvent, Erc20TokensDepositedEvent, DepositErc20CallTrace} from './types/cape'
import { CAPE_ARB_GOERLI, CAPE_NEW, CAPE_OLD } from './constant'
import  {
  utils
} from "ethers"
import {AccountEventTracker, Gauge, MetricOptions} from "@sentio/sdk";
import type {Trace} from "@sentio/sdk";
import { Log } from '@ethersproject/abstract-provider';

const senderTracker4 = AccountEventTracker.register("senders4", {distinctByDays: [1,7,12,30]})
const tokenTracker = AccountEventTracker.register("unique_tokens", {distinctByDays: [1,7,12,30]})
// const senderTracker = AccountEventTracker.register("senders", {distinctByDays: [1,7,12,30]})

export const gaugeOptions: MetricOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

export const sponsor = Gauge.register("Sponsor", gaugeOptions)
export const wrap = Gauge.register("Wrap", gaugeOptions)
export const transfer = Gauge.register("Transfer", gaugeOptions)
export const mint = Gauge.register("Mint", gaugeOptions)
export const freeze = Gauge.register("Freeze", gaugeOptions)
export const burn = Gauge.register("Burn", gaugeOptions)
export const empty = Gauge.register("Empty", gaugeOptions)


const gaugesMap = new Map<string, Gauge>([
  ['Sponsor',sponsor],
    ['Wrap',wrap],
    ['Transfer',transfer],
    ['Mint',mint],
    ['Freeze',freeze],
    ['Burn',burn],
    ['Empty',empty]
]);

const gaugeAndCounter = (name: string, ctx: CapeContext) => {
  gaugesMap.get(name)?.record(ctx,1)
  ctx.meter.Counter(name + "_counter").add(1)
}

const handleAssetSponsored = async (event: AssetSponsoredEvent, ctx: CapeContext) => {
  gaugeAndCounter("Sponsor", ctx)
  const hash = event.transactionHash
  const tx = await ctx.contract.provider.getTransaction(hash)
  const from = tx.from
  const token = event.args.erc20Address
  tokenTracker.trackEvent(ctx, {distinctId: token})
  senderTracker4.trackEvent(ctx, {distinctId: from})
}

const handleErc20TokensDeposited = async (event: Erc20TokensDepositedEvent, ctx: CapeContext) => {
  gaugeAndCounter("Wrap", ctx)
  const hash = event.transactionHash
  const tx = await ctx.contract.provider.getTransaction(hash)
  const from = tx.from
  senderTracker4.trackEvent(ctx, {distinctId: from})
}

// const handleAllEvent = async (event: Log, ctx: CapeContext) => {
//   const hash = event.transactionHash
//   const tx = await ctx.contract.provider.getTransaction(hash)
//   const from = tx.from
//   senderTracker3.trackEvent(ctx, {distinctId: from})
// }


const handleBlockCommittedEvent = async (event: BlockCommittedEvent, ctx: CapeContext) => {
  ctx.meter.Counter("total_block_commit").add(1)

  const note_types_uint = utils.defaultAbiCoder.decode(["uint8[]"], event.args.noteTypes)
  if (note_types_uint.length > 1) {
    ctx.meter.Counter("note_type_unit_gt_one").add(1)
  } else if (note_types_uint.length == 1) {
    const note_types = note_types_uint[0]
    if (note_types) {
      switch (note_types[0]) {
        case 0:
          gaugeAndCounter("Transfer", ctx)
          break;
        case 1:
          gaugeAndCounter("Mint", ctx)
          break;
        case 2:
          gaugeAndCounter("Freeze", ctx)
          break;
        case 3:
          gaugeAndCounter("Burn", ctx)
          break;
        default:
          gaugeAndCounter("Empty", ctx)
          break;
      }
    }
    else {
      gaugeAndCounter("Empty", ctx)
    }
  }
}



CapeProcessor.bind({address: CAPE_NEW, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
// .onCallDepositErc20(handleCall)
// .onCallFaucetSetupForTestnet(handleCall)
// .onCallSponsorCapeAsset(handleCall)
// .onCallSubmitCapeBlock(handleCall)
// .onCallSubmitCapeBlockWithMemos(handleCall)


CapeProcessor.bind({address: CAPE_OLD, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
// .onCallDepositErc20(handleCall)
// .onCallFaucetSetupForTestnet(handleCall)
// .onCallSponsorCapeAsset(handleCall)
// .onCallSubmitCapeBlock(handleCall)
// .onCallSubmitCapeBlockWithMemos(handleCall)

CapeProcessor.bind({address: CAPE_ARB_GOERLI, network: 421613})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
// .onCallDepositErc20(handleCall)
// .onCallFaucetSetupForTestnet(handleCall)
// .onCallSponsorCapeAsset(handleCall)
// .onCallSubmitCapeBlock(handleCall)
// .onCallSubmitCapeBlockWithMemos(handleCall)
// .onAllEvents(handleAllEvent)