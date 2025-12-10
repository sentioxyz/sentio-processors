import { MuPoolProcessor } from './types/eth/mupool.js'
import { network, recordTvl, START_BLOCK } from './utils.js'

const project = 'mu digital'

MuPoolProcessor.bind({
  network,
  address: '0x9c82eb49b51f7dc61e22ff347931ca32adc6cd90',
  startBlock: START_BLOCK,
}).onTimeInterval(
  async (block, ctx) => {
    const [asset, totalAssets] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
    await Promise.all([recordTvl(ctx, asset, totalAssets, project)])
  },
  60 * 12,
  60 * 24,
)
