import { AptosGlobalProcessor, MovementNetwork } from "@sentio/sdk/aptos";


AptosGlobalProcessor.bind({
  network: MovementNetwork.MAIN_NET,
  address: "*"
})
  .onTransaction(async (tx, ctx) => {
    const rawTx = tx
    ctx.eventLogger.emit("Transactions", {
      rawTx
    })
  })