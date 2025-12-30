import { SuiObjectChange } from "@mysten/sui/client"
import { SuiGlobalProcessor, SuiNetwork, SuiObjectChangeContext } from "@sentio/sdk/sui"

const LP_TOKEN_TYPE_PREFIX = [
  //lp object
  "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<",
  //pool object
  "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::Pool<",
  //staked position object
  "0x88701243d0445aa38c0a13f02a9af49a58092dfadb93af9754edb41c52f40085::farm::StakedPosition<"
]

// for (const lp_token_prefix of LP_TOKEN_TYPE_PREFIX) {
//   SuiGlobalProcessor.bind({
//     network: SuiNetwork.MAIN_NET,
//     startCheckpoint: 20280345n
//   })
//     .onObjectChange(async (changes, ctx) => {
//       if (ctx.txDigest == 'EMc73fwyDtnJhFRgNWs53pGC3mvUS7ofKdXdVheby3UT') {
//         console.log(`prefix ${lp_token_prefix} captured`)
//       }
//       for (let i = 0; i < changes.length; i++) {
//         //@ts-ignore
//         console.log(`${i}/${changes.length} change in loop: ${changes[i].objectType} ${changes[i].objectId} ${changes[i].type}  ${changes[i].version} ${changes[i].digest} captured, prefix ${lp_token_prefix}`)

//         // await processObjectChanges(ctx, changes[i], lp_token_prefix)
//       }
//     }, lp_token_prefix)
// }

for (const lp_token_prefix of LP_TOKEN_TYPE_PREFIX) {
  handlePrefix(lp_token_prefix)
}

function handlePrefix(lp_token_prefix: string) {
  SuiGlobalProcessor.bind({
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: 20280345n
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
    let [balance, pool_id, farm_id, stake_amount, owner] = [0, "unk", "unk", 0, "unk"]
    // console.log(`processing entered try ${objectChange} captured`)
    if (obj.status == "VersionFound") {

      if (lp_token_prefix == "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<") {
        //@ts-ignore
        balance = parseInt(obj.details.content.fields.lsp.fields.balance) || 0 //null for object deleted
        //@ts-ignore
        pool_id = obj.details.content.fields.pool_id || "unk" //null for object deleted
      }

      if (lp_token_prefix == "0x88701243d0445aa38c0a13f02a9af49a58092dfadb93af9754edb41c52f40085::farm::StakedPosition<") {
        console.log(`stakedPositionLog ${JSON.stringify(obj)} at ${ctx.txDigest}`)
        //@ts-ignore
        farm_id = obj.details.content.fields.farm_id || "unk" //null for object deleted
        //@ts-ignore
        stake_amount = parseInt(obj.details.content.fields.stake_amount) || 0 //null for object deleted
      }

      if (objectChange.type != "deleted") {
        //@ts-ignore
        owner = obj.details.owner.AddressOwner || "unk" //null for object deleted
      }
    }

    const newObjectChange = {
      ...objectChange,
      owner,
      balance,
      farm_id,
      stake_amount,
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

