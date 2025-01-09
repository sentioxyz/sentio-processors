import { treasury } from "./types/sui/0x6951ee690a25857df1652cd7cd8d412913cca01ee03d87cfa1edb2db06acef24.js";
import './draw-ticket.js'

treasury.bind({})
  .onEventMintEvent(async (event, ctx) => {
    const amount = event.data_decoded.amount
    const to = event.data_decoded.to
    ctx.eventLogger.emit("MintEvent", {
      distinctId: event.sender,
      amount,
      to
    })
    ctx.meter.Gauge("MintGauge").record(amount)
    ctx.meter.Counter("MintCounter").add(amount)
  })
  .onEventBurnEvent(async (event, ctx) => {
    const amount = event.data_decoded.amount
    const from = event.data_decoded.from
    ctx.eventLogger.emit("BurnEvent", {
      distinctId:  event.sender,
      amount,
      from
    })
    ctx.meter.Gauge("BurnGauge").record(amount)
    ctx.meter.Counter("BurnCounter").add(amount)
  })
  // .onTransactionBlock(async (tx, ctx) => {
  //   ctx.eventLogger.emit("ontxb", {
  //     tx: tx.digest
  //   })
  // })

