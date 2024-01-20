import { SuiObjectChange } from "@mysten/sui.js/client"
import { SuiGlobalProcessor, SuiNetwork, SuiObjectChangeContext } from "@sentio/sdk/sui"

const LP_TOKEN_TYPE_PREFIX = [
  "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position"
]


for (const lp_token_prefix of LP_TOKEN_TYPE_PREFIX) {
  handlePrefix(lp_token_prefix)
}


function handlePrefix(lp_token_prefix: string) {
  SuiGlobalProcessor.bind({
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: 23601784n
  })
    .onObjectChange(async (changes, ctx) => {
      // if (ctx.txDigest == 'EMc73fwyDtnJhFRgNWs53pGC3mvUS7ofKdXdVheby3UT') {
      //   console.log(`prefix ${lp_token_prefix} captured EMc73fwyDtnJhFRgNWs53pGC3mvUS7ofKdXdVheby3UT`)
      // }
      for (let i = 0; i < changes.length; i++) {
        //@ts-ignore
        // console.log(`${i}/${changes.length} change in loop: ${changes[i].objectType} ${changes[i].objectId} ${changes[i].type}  ${changes[i].version} ${ctx.txDigest} captured, prefix ${lp_token_prefix}`)

        await processObjectChanges(ctx, changes[i], lp_token_prefix)
      }
    }, lp_token_prefix)
}


async function processObjectChanges(ctx: SuiObjectChangeContext, objectChange: SuiObjectChange, lp_token_prefix: string) {
  // console.log(`processing entered ${objectChange} captured`)
  try {
    //@ts-ignore
    const obj = await ctx.client.tryGetPastObject({ id: objectChange.objectId, version: parseInt(objectChange.version), options: { showOwner: true, showContent: true } })
    let [liquidity, coin_a_type, coin_b_type, owner] = [0, "unk", "unk", "unk"]
    // console.log(`processing entered try ${objectChange} captured`)
    if (obj.status == "VersionFound") {
      console.log(`position ${JSON.stringify(obj)} at ${ctx.txDigest}`)
      //@ts-ignore
      liquidity = parseInt(obj.details.content.fields.liquidity) || 0 //null for object deleted
      //@ts-ignore
      coin_a_type = obj.details.content.fields.coin_type_a.fields.name || "unk" //null for object deleted
      //@ts-ignore
      coin_b_type = obj.details.content.fields.coin_type_b.fields.name || "unk" //null for object deleted

      if (objectChange.type != "deleted") {
        //@ts-ignore
        owner = obj.details.owner.AddressOwner || "unk" //null for object deleted
      }
    }

    const newObjectChange = {
      ...objectChange,
      owner,
      liquidity,
      coin_a_type,
      coin_b_type
    }

    ctx.eventLogger.emit("objectChange", newObjectChange)

  }
  catch (e) {
    console.log(`${e.message} fail to process object changes for ${JSON.stringify(objectChange)}`)
    if (e.message == "Bad response format")
      throw new Error("bad response format, crash the processor and retry later")
  }
}

