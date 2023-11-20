import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { EthChainId, GlobalProcessor } from '@sentio/sdk/eth'

GlobalProcessor.bind({
  network: EthChainId.BINANCE,
  startBlock: 33621400
})
  .onTransaction(async (tx, ctx) => {

    ctx.eventLogger.emit("inscription", {
      data: tx.data
    })

  })
