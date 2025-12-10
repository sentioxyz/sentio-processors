import { GlobalProcessor } from '@sentio/sdk/eth'
import { network, START_BLOCK } from './utils.js'

GlobalProcessor.bind({ network, startBlock: START_BLOCK }).onTransaction((tx, ctx) => {
  ctx.eventLogger.emit('tx', {
    distinctId: tx.from,
  })
})
