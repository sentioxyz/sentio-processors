// import { treasury } from "./types/sui/0x6951ee690a25857df1652cd7cd8d412913cca01ee03d87cfa1edb2db06acef24.js";
// import './draw-ticket.js'
import { SuiContext, SuiObjectChangeContext, SuiObjectTypeProcessor } from "@sentio/sdk/sui";

// treasury.bind({})
//   .onEventMintEvent(async (event, ctx) => {
//     const amount = event.data_decoded.amount
//     const to = event.data_decoded.to
//     ctx.eventLogger.emit("MintEvent", {
//       distinctId: event.sender,
//       amount,
//       to
//     })
//     ctx.meter.Gauge("MintGauge").record(amount)
//     ctx.meter.Counter("MintCounter").add(amount)
//   })
//   .onEventBurnEvent(async (event, ctx) => {
//     const amount = event.data_decoded.amount
//     const from = event.data_decoded.from
//     ctx.eventLogger.emit("BurnEvent", {
//       distinctId:  event.sender,
//       amount,
//       from
//     })
//     ctx.meter.Gauge("BurnGauge").record(amount)
//     ctx.meter.Counter("BurnCounter").add(amount)
//   })
  // .onTransactionBlock(async (tx, ctx) => {
  //   ctx.eventLogger.emit("ontxb", {
  //     tx: tx.digest
  //   })
  // })



import { ntx } from "./types/sui/0x6951ee690a25857df1652cd7cd8d412913cca01ee03d87cfa1edb2db06acef24.js";
import { _0x2 } from "@sentio/sdk/sui/builtin";
import { parseMoveType } from "@sentio/sdk/move";


SuiObjectTypeProcessor.bind({
  objectType: parseMoveType('0x2::token::Token<0x6951ee690a25857df1652cd7cd8d412913cca01ee03d87cfa1edb2db06acef24::ntx::NTX>')
  // _0x2.token.Token.type(ntx.NTX.type())
})
.onObjectChange(async(objectChanges, ctx)=>{

  for (const objectChange of objectChanges) {
    if (objectChange.outputState=='PackageWrite')
      return


    //handle the ntc obj change, only mutate and create op
    const [objectType, owner, amount] =await getObjectTypeOwnerAmount(ctx, objectChange.objectId)

    if (objectType!=_0x2.token.Token.TYPE_QNAME+'<'+ntx.NTX.TYPE_QNAME+'>')
      return


    ctx.eventLogger.emit("NtxObjectChange", {
      distinctId: owner,
      objectId: objectChange.objectId,
      amount,
      version: objectChange.outputVersion
    })

  }
})


async function getObjectTypeOwnerAmount(ctx: SuiObjectChangeContext, objectId:string): Promise<[string, string, any]> {
  const { object } = await ctx.client.getObject({ objectId, include: { json: true } })
  const objectType = object.type
  const owner = object.owner?.$kind=='AddressOwner' ? object.owner.AddressOwner : "null"
  //@ts-ignore
  const amount = object.json?.balance??0
  return [objectType, owner, amount]
}