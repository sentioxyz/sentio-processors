import { SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui"



SuiGlobalProcessor.bind({
  network: SuiNetwork.MAIN_NET
})
  .onTransactionBlock(async (tx, ctx) => {
    //do nothing
  }, {})