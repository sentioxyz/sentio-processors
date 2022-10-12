import { Counter, Gauge } from '@sentio/sdk'
import { token } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { CapeContext, CapeProcessor, AssetSponsoredEvent, BlockCommittedEvent, FaucetInitializedEvent, Erc20TokensDepositedEvent} from './types/cape'
import { CAPE_NEW } from './constant'

const handleAssetSponsored = async (evnet: any, ctx: CapeContext) => {
  ctx.meter.Gauge("Sponsor").record(1)
}

const handleErc20TokensDeposited = async (evnet: any, ctx: CapeContext) => {
  ctx.meter.Gauge("Wrap").record(1)
}

const handleBlockCommittedEvent = async (evnet: BlockCommittedEvent, ctx: CapeContext) => {
  ctx.meter.Gauge("Wrap").record(1)
}

CapeProcessor.bind({address: CAPE_NEW, network: 5})
.onEventAssetSponsored(handleAssetSponsored)
