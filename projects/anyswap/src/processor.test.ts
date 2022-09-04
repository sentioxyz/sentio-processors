import { TestProcessorServer } from '@sentio/sdk/test'

describe('Test Processor', () => {
  const service = new TestProcessorServer()

  beforeAll(async () => {
    service.setup()
    require('./processor')
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })
})
