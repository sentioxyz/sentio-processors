import { capy, eden, capy_market } from './types/sui/testnet/capy.js'

eden.bind()
  .onEntryGetCapy((call, ctx) => {
    ctx.meter.Counter('callEdenGetCapy').add(1)
  }
)

capy_market.bind()
  .onEventItemListed((evt, ctx) => {
    const price = evt.fields_decoded.price
    ctx.meter.Counter('evtItemListed').add(1)
    ctx.meter.Gauge('price').record(evt.fields_decoded.price)

    ctx.eventLogger.emit("List", {
      message: `list ${evt.fields_decoded.item_id} from ${evt.fields_decoded.owner}`,
      distinctId: evt.sender,
      ...evt.fields_decoded
    })
  }
)

capy.bind()
  .onEventCapyBorn((evt, ctx) => {
    ctx.meter.Counter('evtCapyBorn').add(1)
    ctx.meter.Gauge("gen").record(evt.fields_decoded.gen)
    // ctx.meter.Counter('evtCapyBornTotalGens').add(evt.fields_decoded.gen)
    ctx.eventLogger.emit("CapyBorn", {
      message: `new capy from ${evt.fields_decoded.parent_one} and ${evt.fields_decoded.parent_two}`,
      distinctId: evt.sender,
      gen: evt.fields_decoded.gen,
      parent_one: evt.fields_decoded.parent_one,
      parent_two: evt.fields_decoded.parent_two,
      bred_by: evt.fields_decoded.bred_by
    })
  }
).onEventItemAdded((evt, ctx) => {
    ctx.meter.Counter('evtItemAdded').add(1)
  }
).onEventItemRemoved((evt, ctx) => {
    ctx.meter.Counter('evtItemRemoved').add(1)
  }
).onEntryAddGene((call, ctx) => {
    const name = call.arguments_decoded[2]
    const nameString = new TextDecoder().decode(new Uint8Array(name))
    ctx.meter.Counter('callAdminAddGene').add(1, { "name": nameString })
  }
).onEntryBreedAndKeep((call, ctx) => {
    ctx.meter.Counter('callBreedAndKeep').add(1)
  }
)