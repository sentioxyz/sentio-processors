import { capy, eden, capy_market } from './types/sui/capy.js'

eden.bind()
  .onEntryGetCapy((call, ctx) => {
    ctx.meter.Counter('callEdenGetCapy').add(1)
  }
)

capy_market.bind()
  .onEventItemListed((evt, ctx) => {
    const price = evt.fields_decoded.price
    ctx.meter.Counter('evtItemListed').add(1)
    ctx.meter.Counter('evtItemListedTotalPrice').add(price)
  }
)

capy.bind()
  .onEventCapyBorn((evt, ctx) => {
    ctx.meter.Counter('evtCapyBorn').add(1)
    ctx.meter.Counter('evtCapyBornTotalGens').add(evt.fields_decoded.gen)
  }
).onEventItemAdded((evt, ctx) => {
    ctx.meter.Counter('evtItemAdded').add(1)
  }
).onEventItemRemoved((evt, ctx) => {
    ctx.meter.Counter('evtItemRemoved').add(1)
  }
).onEntryAddGene((call, ctx) => {
    var name = call.arguments_decoded[2]
    ctx.meter.Counter('callAdminAddGene').add(1, { "name": name })
  }
).onEntryBreedAndKeep((call, ctx) => {
    ctx.meter.Counter('callBreedAndKeep').add(1)
  }
)