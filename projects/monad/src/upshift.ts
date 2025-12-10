import { getPriceBySymbol, token } from '@sentio/sdk/utils'
import { UpshiftProcessor } from './types/eth/upshift.js'
import { network, recordTvl, START_BLOCK } from './utils.js'

const project = 'upshift'

UpshiftProcessor.bind({
  network,
  startBlock: START_BLOCK,
  address: '0x36eDbF0C834591BFdfCaC0Ef9605528c75c406aA',
}).onTimeInterval(
  async (block, ctx) => {
    const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.getTotalAssets()])
    await recordTvl(ctx, asset, total, project)
  },
  60 * 12,
  60 * 24,
)
