import { DotBitContext, DotBitProcessor } from "./types/dotbit"
import { AccountEventTracker } from "@sentio/sdk";
const TOKEN_ADDR = "0x60eb332bd4a0e2a9eeb3212cfdd6ef03ce4cb3b5" 

const accountTracker = AccountEventTracker.register("addresses")

DotBitProcessor.bind({ address: TOKEN_ADDR})
.onEventApprovalForAll((evt, ctx) => {
  const operator = evt.args.operator
  ctx.meter.Counter("approval_for_all_count").add(1)
  ctx.meter.Gauge("approval_for_all_gauge").record(1, {operator: operator})
  accountTracker.trackEvent(ctx, { distinctId: evt.args.owner })
})
.onEventTransfer((evt, ctx) => {

  ctx.meter.Counter("transfer_counter").add(1)
  ctx.meter.Gauge("transfer_gauge").record(1)
  accountTracker.trackEvent(ctx, { distinctId: evt.args.from })
})
