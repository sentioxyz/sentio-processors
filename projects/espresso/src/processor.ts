import { CapeContext, CapeProcessor, AssetSponsoredEvent, BlockCommittedEvent, FaucetInitializedEvent, Erc20TokensDepositedEvent, DepositErc20CallTrace} from './types/cape'
import { CAPE_ARB_GOERLI, CAPE_NEW, CAPE_OLD } from './constant'
import  {
  utils
} from "ethers"
import { AccountEventTracker} from "@sentio/sdk";
import type {Trace} from "@sentio/sdk";

const senderTracker = AccountEventTracker.register("senders", {distinctByDays: [1,7,12,30]})

const gaugeAndCounter = (name: string, ctx: CapeContext) => {
  ctx.meter.Gauge(name).record(1)
  ctx.meter.Counter(name + "_counter").add(1)
}

const handleAssetSponsored = async (event: any, ctx: CapeContext) => {
  gaugeAndCounter("Sponsor", ctx)
}

const handleErc20TokensDeposited = async (event: any, ctx: CapeContext) => {
  gaugeAndCounter("Wrap", ctx)
}

const handleCall = async (trace: Trace, ctx: CapeContext) => {
  const sender = trace.action.from
  senderTracker.trackEvent(ctx, {distinctId: sender})
}

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
.onCallDepositErc20(handleCall)
.onCallFaucetSetupForTestnet(handleCall)
.onCallSponsorCapeAsset(handleCall)
.onCallSubmitCapeBlock(handleCall)
.onCallSubmitCapeBlockWithMemos(handleCall)


CapeProcessor.bind({address: CAPE_OLD, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
.onCallDepositErc20(handleCall)
.onCallFaucetSetupForTestnet(handleCall)
.onCallSponsorCapeAsset(handleCall)
.onCallSubmitCapeBlock(handleCall)
.onCallSubmitCapeBlockWithMemos(handleCall)

CapeProcessor.bind({address: CAPE_ARB_GOERLI, network: 421613})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
.onCallDepositErc20(handleCall)
.onCallFaucetSetupForTestnet(handleCall)
.onCallSponsorCapeAsset(handleCall)
.onCallSubmitCapeBlock(handleCall)
.onCallSubmitCapeBlockWithMemos(handleCall)
