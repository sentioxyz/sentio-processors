import { ChainLink_RouterProcessor } from './types/eth/chainlink_router.js'
import { token } from '@sentio/sdk/utils'
import { network, startBlock } from './utils.js'

ChainLink_RouterProcessor.bind({
  address: '0x33566fE5976AAa420F3d5C64996641Fc3858CaDB',
  network,
  startBlock
}).onEventMessageExecuted(
  async (evt, ctx) => {
    const logs = ctx.transactionReceipt?.logs || []
    for (const log of logs) {
      if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        const info = await token.getERC20TokenInfo(ctx, log.address)
        ctx.eventLogger.emit('bridge', {
          type: 'in',
          name: 'chainlink',
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
