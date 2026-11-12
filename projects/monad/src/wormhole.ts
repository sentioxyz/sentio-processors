import { Wormhole_GmpManagerProcessor } from './types/eth/wormhole_gmpmanager.js'
import { token } from '@sentio/sdk/utils'
import { network, startBlock } from './utils.js'

Wormhole_GmpManagerProcessor.bind({ address: '0x92957b3D0CaB3eA7110fEd1ccc4eF564981a59Fc', network, startBlock })
  .onEventMessageSent(
    async (evt, ctx) => {
      const logs = ctx.transactionReceipt?.logs || []
      for (const log of logs) {
        if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          const info = await token.getERC20TokenInfo(ctx, log.address)
          ctx.eventLogger.emit('bridge', {
            type: 'out',
            name: 'wormhole',
            coin_symbol: info.symbol.toLowerCase(),
            amount: BigInt(log.data).scaleDown(info.decimal)
          })
          return
        }
      }
    },
    undefined,
    {
      transaction: true,
      transactionReceipt: true,
      transactionReceiptLogs: true
    }
  )
  .onEventMessageExecuted(
    async (evt, ctx) => {
      const logs = ctx.transactionReceipt?.logs || []
      for (const log of logs) {
        if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          const info = await token.getERC20TokenInfo(ctx, log.address)
          ctx.eventLogger.emit('bridge', {
            type: 'in',
            name: 'wormhole',
            coin_symbol: info.symbol.toLowerCase(),
            amount: BigInt(log.data).scaleDown(info.decimal)
          })
          return
        }
      }
    },
    undefined,
    {
      transaction: true,
      transactionReceipt: true,
      transactionReceiptLogs: true
    }
  )
