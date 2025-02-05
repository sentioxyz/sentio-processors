import { SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui"

SuiGlobalProcessor.bind({
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 25671138n
})
  .onTransactionBlock(async (_, ctx) => {

    const balanceChanges = ctx.transaction.balanceChanges
    if (balanceChanges) {
      for (let i = 0; i < balanceChanges.length; i++) {
        const amount = balanceChanges[i].amount
        const coinType = balanceChanges[i].coinType
        /** Owner of the balance change */
        const owner = balanceChanges[i].owner

        if (coinType == "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX") {
          console.log("match")
        }

        ctx.eventLogger.emit("balanceChanges", {
          amount,
          coinType,
          owner
        })
      }
    }


  },
    {},
    { resourceChanges: true }
  )