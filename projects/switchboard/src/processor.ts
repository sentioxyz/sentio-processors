import { CHAIN_IDS, Counter, Gauge } from "@sentio/sdk";
import { events } from "./types/aptos/switchboard.js";

events.bind().onEventAggregatorUpdateEvent(async (event, ctx) => {
  ctx.eventLogger.emit("aggregatorUpdate", {
    type: event.data_decoded.aggregator_address,
    oldValue: event.data_decoded.old_value,
    newValue: event.data_decoded.new_value,
  });
});
