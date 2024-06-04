import { EthChainId, GlobalProcessor } from '@sentio/sdk/eth'
import { gasCost } from './helper.js'

GlobalProcessor.bind({
  //@ts-ignore
  network: '167000',
}).onTransaction(
  async (tx, ctx) => {
    let txStatus = "fail"
    if (ctx.transactionReceipt) {
      txStatus = "success"
      console.log("status", ctx.transactionReceipt?.status)
    }

    // const txStatus = (!ctx.transactionReceipt || ctx.transactionReceipt?.status != 1) ? "fail" : "success"
    const gas = gasCost(ctx)

    ctx.eventLogger.emit('tx', {
      distinctId: tx.from,
      to: tx.to,
      value: tx.value,
      gas,
      txStatus
    })

    ctx.meter.Counter("tx_counter").add(1, { txStatus })
    ctx.meter.Counter("gas_counter").add(gas, { txStatus })

  },
  {
    transaction: true,
    transactionReceipt: true,
  },
)

