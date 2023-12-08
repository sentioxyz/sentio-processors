import { SuiObjectChange } from "@mysten/sui.js/client"
import { SuiGlobalProcessor, SuiNetwork, SuiObjectChangeContext } from "@sentio/sdk/sui"

const LP_TOKEN_TYPE = "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN, 0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN>"

SuiGlobalProcessor.bind({
  network: SuiNetwork.MAIN_NET
})
  .onObjectChange(async (changes, ctx) => {

    for (let i = 0; i < changes.length; i++) {
      // console.log("objectChanges", JSON.stringify(changes[i]))

      await processObjectChanges(ctx, changes[i])
    }

  }, LP_TOKEN_TYPE)




async function processObjectChanges(ctx: SuiObjectChangeContext, objectChange: SuiObjectChange) {
  try {
    //@ts-ignore
    // const obj = await ctx.client.tryGetPastObject({ id: objectChange.objectId, version: Number(objectChange.version), options: { showOwner: true, showContent: true } })
    const obj = await ctx.client.tryGetPastObject({ id: "0x44a23a584e3120b7329ead7249425d278582d4ea2f426275e3e2ca542dd37f0d", version: 20671342, options: { showOwner: true, showContent: true } })
    let [balance, pool_id, owner] = [0, "unk", "unk"]

    if (obj.status == "VersionFound") {
      //@ts-ignore
      balance = Number(obj.details.content.fields.lsp.fields.balance) || 0 //null for object deleted
      //@ts-ignore
      pool_id = obj.details.content.fields.pool_id || "unk" //null for object deleted
      //@ts-ignore
      owner = obj.details.owner.AddressOwner || "unk" //null for object deleted
    }

    const newObjectChange = {
      ...objectChange,
      owner,
      balance,
      pool_id
    }

    ctx.eventLogger.emit("objectChange", newObjectChange)

  }
  catch (e) {
    console.log(`${e.message} fail to process object changes for ${JSON.stringify(objectChange)}`)
    if (e.message == "Bad response format")
      throw new Error("bad response format, crash the processor and retry later")
  }
}

