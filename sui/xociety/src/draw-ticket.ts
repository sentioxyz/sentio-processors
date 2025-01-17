import { treasury } from "./types/sui/0xadecb5f6ddcb4b80190499d3b40ae4c82b79ea36f2bed9d412278080f295b89f.js";

treasury.bind()
.onEventMintEvent(async (event, ctx) => {
    const amount = event.data_decoded.amount
    const to = event.data_decoded.to
    ctx.eventLogger.emit("MintDrawTicketEvent", {
      distinctId: event.sender,
      amount,
      to
    })
    ctx.meter.Gauge("MintDrawTicket").record(amount)
    ctx.meter.Counter("MintDrawTicketCounter").add(amount)
  })
  .onEventBurnEvent(async (event, ctx) => {
    const amount = event.data_decoded.amount
    const from = event.data_decoded.from
    ctx.eventLogger.emit("BurnDrawTicketEvent", {
      distinctId: event.sender,
      amount,
      from
    })
    ctx.meter.Gauge("BurnDrawTicketGauge").record(amount)
    ctx.meter.Counter("BurnDrawTicketCounter").add(amount)
  })
 