import { GlobalProcessor } from '@sentio/sdk/eth'
import { network } from './utils.js'

GlobalProcessor.bind({ network }).onTransaction((tx, ctx) => {
  ctx.eventLogger.emit('tx', {
    distinctId: tx.from,
  })
})
