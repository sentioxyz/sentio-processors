import { SuiGlobalProcessor, SuiNetwork, SuiObjectProcessor, SuiWrappedObjectProcessor } from "@sentio/sdk/sui";

SuiGlobalProcessor.bind({
  network: SuiNetwork.MAIN_NET
})
  .onTransactionBlock(async (block, ctx) => {
    const balanceChanges =
      ctx.transaction.balanceChanges
    for (let i = 0; i < balanceChanges.length; i++) {
      const amount = balanceChanges[i].amount
      //ctx.eventLogger.emit("SomeTableName", {amount}) to record the data
  },
    {
    })