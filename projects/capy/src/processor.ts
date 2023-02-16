import { SuiBaseProcessor, SuiBindOptions, SuiNetwork } from '@sentio/sdk/sui'

class CapyProcessor extends SuiBaseProcessor {
  static bind(options: SuiBindOptions): CapyProcessor {
    return new CapyProcessor('capy', options)
  }
}

CapyProcessor.bind({
  address: '0x4c10b61966a34d3bb5c8a8f063e6b7445fc41f93',
  network: SuiNetwork.TEST_NET,
  startTimestamp: 1674831986485
}).onMoveEvent(
  (evt, ctx) => {
    const gen = parseInt(evt.fields?.gen)
    ctx.meter.Counter('evtCapyBorn').add(1)
    ctx.meter.Counter('evtCapyBornTotalGens').add(gen)
  },
  {
    type: 'capy::CapyBorn',
  }
).onMoveEvent(
  (evt, ctx) => {
    ctx.meter.Counter('evtItemAdded').add(1)
  },
  {
    type: 'capy::ItemAdded',
  }
).onMoveEvent(
  (evt, ctx) => {
    ctx.meter.Counter('evtItemRemoved').add(1)
  },
  {
    type: 'capy::ItemRemoved',
  }
).onMoveEvent(
  (evt, ctx) => {
    const price = parseInt(evt.fields?.price)
    ctx.meter.Counter('evtItemListed').add(1)
    ctx.meter.Counter('evtItemListedTotalPrice').add(price)
  },
  {
    type: 'capy::ItemListed',
  }
).onEntryFunctionCall(
  (call, ctx) => {
    var name = String(call.arguments?.at(2))
    ctx.meter.Counter('callAdminAddGene').add(1, { "name": name })
  }, 
  {
    function: 'capy_admin::add_gene',
  }
).onEntryFunctionCall(
  (call, ctx) => {
    ctx.meter.Counter('callEdenGetCapy').add(1)
  }, 
  {
    function: 'eden::get_capy',
  }
).onEntryFunctionCall(
  (call, ctx) => {
    ctx.meter.Counter('callBreedAndKeep').add(1)
  }, 
  {
    function: 'capy::breed_and_keep',
  }
)
