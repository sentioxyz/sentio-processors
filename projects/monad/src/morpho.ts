import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { getMetaMorphoContractOnContext, MetaMorphoProcessorTemplate } from './types/eth/metamorpho.js'
import { MetaMorphoFactoryProcessor } from './types/eth/metamorphofactory.js'
import { network, recordTvl, START_BLOCK } from './utils.js'
import { getPriceBySymbol, token } from '@sentio/sdk/utils'

const project = 'morpho'

const template = new MetaMorphoProcessorTemplate().onTimeInterval(
  async (block, ctx) => {
    const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
    await recordTvl(ctx, asset, total, project)
  },
  60 * 12,
  60 * 24,
)

MetaMorphoFactoryProcessor.bind({
  network,
  address: '0x33f20973275B2F574488b18929cd7DCBf1AbF275',
}).onEventCreateMetaMorpho(async (evt, ctx) => {
  const { metaMorpho } = evt.args
  const contract = getMetaMorphoContractOnContext(ctx, metaMorpho)
  const asset = await contract.asset()
  try {
    const symbol = await getERC20ContractOnContext(ctx, asset).symbol()
    const price = await getPriceBySymbol(symbol, ctx.timestamp)
    if (price) {
      const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
      template.bind({ address: metaMorpho, startBlock }, ctx)
    }
  } catch (e) {
    console.warn('invalid meta morpho', metaMorpho)
  }
})
