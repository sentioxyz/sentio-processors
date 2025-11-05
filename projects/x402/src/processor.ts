import { Counter } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { EthChainId, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { facilitators } from './consts.js'

const txCounter = Counter.register('tx')
const volumeCounter = Counter.register('volume')

const baseStartBlock = 36230000
const baseTokens = {
  usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
}

const baseFacilitatorAddresses = facilitators
  .map(([, addresses]) => {
    return addresses.base || []
  })
  .flat()

const filters = baseFacilitatorAddresses.map((f) => ERC20Processor.filters.Transfer(f))

GlobalProcessor.bind({ network: EthChainId.BASE, startBlock: baseStartBlock }).onTransaction(async (tx, ctx) => {
  for (const [project, addresses] of facilitators) {
    if (addresses.base?.includes(tx.from)) {
      txCounter.add(ctx, 1, { project })
      break
    }
  }
})

ERC20Processor.bind({ address: baseTokens.usdc, network: EthChainId.BASE, startBlock: baseStartBlock }).onEventTransfer(
  async (evt, ctx) => {
    for (const [project, addresses] of facilitators) {
      if (addresses.base?.includes(evt.args.from)) {
        volumeCounter.add(ctx, evt.args.value, { project, symbol: 'USDC' })
        break
      }
    }
  }
)
