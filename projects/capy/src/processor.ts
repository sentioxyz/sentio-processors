import { SuiBaseProcessor, SuiBindOptions, SuiNetwork } from '@sentio/sdk/sui'

class CapyProcessor extends SuiBaseProcessor {
  static bind(options: SuiBindOptions): CapyProcessor {
    return new CapyProcessor('Capy', options)
  }
}

CapyProcessor.bind({
  address: '0x4c10b61966a34d3bb5c8a8f063e6b7445fc41f93',
  network: SuiNetwork.TEST_NET,
  startTimestamp: 1674831986485
}).onMoveEvent(
  (evt, ctx) => {
    const gen = parseInt(evt.fields?.gen)
    ctx.meter.Counter('capyBorn').add(1)
    ctx.meter.Counter('capyBornTotalGen').add(gen)
  },
  {
    type: 'capy::CapyBorn',
  }
)
