import { CapeContext, CapeProcessor, AssetSponsoredEvent, BlockCommittedEvent, FaucetInitializedEvent, Erc20TokensDepositedEvent} from './types/cape'
import { CAPE_NEW } from './constant'
import  {
  utils
} from "ethers"
const handleAssetSponsored = async (event: any, ctx: CapeContext) => {
  ctx.meter.Gauge("Sponsor").record(1)
}

const handleErc20TokensDeposited = async (event: any, ctx: CapeContext) => {
  ctx.meter.Gauge("Wrap").record(1)
}

const handleBlockCommittedEvent = async (event: BlockCommittedEvent, ctx: CapeContext) => {
  const note_types_uint = utils.defaultAbiCoder.decode(["uint8[]"], event.args.noteTypes)
  if (note_types_uint.length > 1) {
    ctx.meter.Counter("note_type_unit_gt_one").add(1)
  } else if (note_types_uint.length == 1) {
    const note_types = note_types_uint[0]
    switch(note_types) {
      case 0: ctx.meter.Gauge("Transfer").record(1); break;
      case 1: ctx.meter.Gauge("Mint").record(1); break;
      case 2: ctx.meter.Gauge("Freeze").record(1); break;
      case 3: ctx.meter.Gauge("Burn").record(1); break;
      default: ctx.meter.Gauge("illegal_note_type").record(1); break;
    } 
  }
  else {
    ctx.meter.Gauge("Empty").record(1)
  }
}

CapeProcessor.bind({address: CAPE_NEW, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
.onEventBlockCommitted(handleBlockCommittedEvent)
.onEventErc20TokensDeposited(handleErc20TokensDeposited)
