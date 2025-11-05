import { Counter } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { EthChainId, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { facilitators } from './consts.js'

const txCounter = Counter.register('tx')
const totalVolumeCounter = Counter.register('total_volume')

const baseStartBlock = 36230000
// const baseStartBlock = 37700000
const baseTokens = {
  usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
}

// GlobalProcessor.bind({ network: EthChainId.BASE, startBlock: baseStartBlock }).onTransaction(async (tx, ctx) => {
//   for (const [project, addresses] of facilitators) {
//     if (addresses.base?.includes(tx.from.toLowerCase())) {
//       txCounter.add(ctx, 1, { project })
//       break
//     }
//   }
// })

const baseFacilitatorAddresses = facilitators
  .map(([, addresses]) => {
    return addresses.base || []
  })
  .flat()

const filters = baseFacilitatorAddresses.map((f) => ERC20Processor.filters.Transfer(f))

ERC20Processor.bind({ address: baseTokens.usdc, network: EthChainId.BASE, startBlock: baseStartBlock }).onEventTransfer(
  async (evt, ctx) => {
    const from = ctx.transaction?.from.toLowerCase()
    for (const [project, addresses] of facilitators) {
      if (from && addresses.base?.includes(from)) {
        // totalVolumeCounter.add(ctx, evt.args.value, { project, symbol: 'USDC' })
        const { from, to, value } = evt.args
        ctx.eventLogger.emit('transfer', {
          distinctId: from,
          from,
          to,
          value: evt.args.value.scaleDown(6),
          project,
          symbol: 'USDC'
        })
        break
      }
    }
  },
  undefined,
  // filters,
  { transaction: true }
)
