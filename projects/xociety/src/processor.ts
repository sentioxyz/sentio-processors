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
  
  objectChanges.forEach(async (objectChange, index) => {
    if (objectChange.type=='published') 
      return
    if (objectChange.objectType!=_0x2.token.Token.TYPE_QNAME+'<'+ntx.NTX.TYPE_QNAME+'>') 
      return


    //handle the ntc obj change, only mutate and create op
      const [owner, amount] =await getObjectOwnerAmount(ctx, objectChange.objectId, objectChange.version)

      
      ctx.eventLogger.emit("NtxObjectChange", {
        distinctId: owner,
        sender: objectChange.sender,
        objectId: objectChange.objectId,
        amount,
        version: objectChange.version
      })
    
    
  })
})


async function getObjectOwnerAmount(ctx: SuiObjectChangeContext, objectId:string, version: string) {
  const obj = await ctx.client.tryGetPastObject({ id: objectId, version: parseInt(version), options: { showOwner: true, showContent: true } })
  if (obj.status=='VersionFound')
    {
      //@ts-ignore
      const owner = obj.details.owner.AddressOwner??"null"
      //@ts-ignore
      const amount = obj.details.content.fields.balance??0
      return [owner, amount]
    }
  return ["null",0]
}