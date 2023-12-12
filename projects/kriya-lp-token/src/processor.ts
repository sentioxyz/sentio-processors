import { SuiObjectChange } from "@mysten/sui.js/client"
import { SuiGlobalProcessor, SuiNetwork, SuiObjectChangeContext } from "@sentio/sdk/sui"

const LP_TOKEN_TYPE_PREFIX = [
  //lp object
  "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<",
  //pool object
  "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::Pool<",
  //staked position object
  "0x88701243d0445aa38c0a13f02a9af49a58092dfadb93af9754edb41c52f40085::farm::StakedPosition<"
]

for (const lp_token_prefix of LP_TOKEN_TYPE_PREFIX) {
  SuiGlobalProcessor.bind({
    network: SuiNetwork.MAIN_NET
  })
    .onObjectChange(async (changes, ctx) => {

      for (let i = 0; i < changes.length; i++) {
        // console.log("objectChanges", JSON.stringify(changes[i]))

        await processObjectChanges(ctx, changes[i])
      }

    }, lp_token_prefix)
}



async function processObjectChanges(ctx: SuiObjectChangeContext, objectChange: SuiObjectChange) {
  try {
    //@ts-ignore
    const obj = await ctx.client.tryGetPastObject({ id: objectChange.objectId, version: parseInt(objectChange.version), options: { showOwner: true, showContent: true } })
    let [balance, pool_id, owner] = [0, "unk", "unk"]

    if (obj.status == "VersionFound") {
      //@ts-ignore
      balance = parseInt(obj.details.content.fields.lsp.fields.balance) || 0 //null for object deleted
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

