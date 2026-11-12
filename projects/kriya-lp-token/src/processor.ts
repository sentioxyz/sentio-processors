import { SuiClientTypes } from "@mysten/sui/client"
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


async function processObjectChanges(ctx: SuiObjectChangeContext, objectChange: SuiClientTypes.ChangedObject, lp_token_prefix: string) {
  // console.log(`processing entered ${objectChange} captured`)
  try {
    const { object: obj } = await ctx.client.getObject({ objectId: objectChange.objectId, include: { json: true } })
    let [balance, pool_id, farm_id, stake_amount, owner] = [0, "unk", "unk", 0, "unk"]
    // console.log(`processing entered try ${objectChange} captured`)
    if (obj) {

      if (lp_token_prefix == "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<") {
        //@ts-ignore
        balance = parseInt(obj.json?.lsp.fields.balance) || 0 //null for object deleted
        //@ts-ignore
        pool_id = obj.json?.pool_id || "unk" //null for object deleted
      }

      if (lp_token_prefix == "0x88701243d0445aa38c0a13f02a9af49a58092dfadb93af9754edb41c52f40085::farm::StakedPosition<") {
        console.log(`stakedPositionLog ${JSON.stringify(obj)} at ${ctx.txDigest}`)
        //@ts-ignore
        farm_id = obj.json?.farm_id || "unk" //null for object deleted
        //@ts-ignore
        stake_amount = parseInt(obj.json?.stake_amount) || 0 //null for object deleted
      }

      if (objectChange.idOperation != "Deleted") {
        if (objectChange.outputOwner?.$kind === "AddressOwner") {
          owner = objectChange.outputOwner.AddressOwner || "unk" //null for object deleted
        }
      }
    }

    const newObjectChange = {
      objectId: objectChange.objectId,
      type: objectChange.idOperation,
      idOperation: objectChange.idOperation,
      inputState: objectChange.inputState,
      inputVersion: objectChange.inputVersion,
      inputDigest: objectChange.inputDigest,
      outputState: objectChange.outputState,
      version: objectChange.outputVersion,
      digest: objectChange.outputDigest,
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

