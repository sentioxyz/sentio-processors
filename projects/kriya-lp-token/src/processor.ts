import { SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui"



SuiGlobalProcessor.bind({
  network: SuiNetwork.MAIN_NET
})
  .onTransactionBlock(async (tx, ctx) => {
    const balanceChanges = ctx.transaction.balanceChanges

    if (balanceChanges) {
      for (let i = 0; i < balanceChanges.length; i++) {
        const amount = balanceChanges[i].amount
        const coinType = balanceChanges[i].coinType
        const owner = balanceChanges[i].owner
        ctx.eventLogger.emit("balanceChanges", {
          amount,
          coinType,
          owner
        })
      }
    }

    const objectChanges = ctx.transaction.objectChanges
    if (objectChanges) {
      for (let i = 0; i < objectChanges.length; i++) {
        console.log("objectChanges", JSON.stringify(objectChanges[i]))
        await processObjectChanges(ctx, objectChanges[i])
      }
    }

  }, {}, { resourceChanges: true })




async function processObjectChanges(ctx: any, objectChange: any) {
  switch (objectChange.type) {
    case "transferred":
      ctx.eventLogger.emit("transferred", {
        objectId: objectChange.objectId,
        objectType: objectChange.objectType,
        recipient: objectChange.recipient,
        sender: objectChange.sender,
        version: objectChange.version
      })
      break
    case "mutated":
      ctx.eventLogger.emit("mutated", {
        objectId: objectChange.objectId,
        objectType: objectChange.objectType,
        owner: objectChange.owner,
        sender: objectChange.sender,
        previousVersion: objectChange.previousVersion,
        version: objectChange.version
      })
      break
    case "deleted":
      ctx.eventLogger.emit("deleted", {
        objectId: objectChange.objectId,
        objectType: objectChange.objectType,
        sender: objectChange.sender,
        version: objectChange.version
      })
      break
    case "created":
      ctx.eventLogger.emit("deleted", {
        objectId: objectChange.objectId,
        objectType: objectChange.objectType,
        owner: objectChange.owner,
        sender: objectChange.sender,
        version: objectChange.version
      })
      break
    default://do nothing for wrapped & published
      break
  }
}

