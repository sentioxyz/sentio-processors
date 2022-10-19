import { CapeContext, CapeProcessor, AssetSponsoredEvent, BlockCommittedEvent, FaucetInitializedEvent, Erc20TokensDepositedEvent} from './types/cape'
import { CAPE_NEW, CAPE_OLD } from './constant'
import  {
  utils
} from "ethers"

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

CapeProcessor.bind({address: CAPE_OLD, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
