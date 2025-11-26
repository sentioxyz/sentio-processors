import { GlobalProcessor } from '@sentio/sdk/eth'
import { network, startBlock } from './utils.js'

GlobalProcessor.bind({ network, startBlock }).onTransaction((tx, ctx) => {
  ctx.eventLogger.emit('tx', {
    distinctId: tx.from
  })
})
