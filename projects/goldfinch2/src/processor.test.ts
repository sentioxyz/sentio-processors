import { TestProcessorServer } from '@sentio/sdk/lib/test'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=> require('./processor'))

  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('Check block dispatch', async () => {
    const blockData = {
      hash: '0x2b9b7cce1f17f3b7e1f3c2472cc806a07bee3f0baca07d021350950d81d73a42',
      number: 14142654,
      timestamp: 1647106437,
      extraData: '0xe4b883e5bda9e7a59ee4bb99e9b1bc493421',
    }

    const res = (await service.testBlock(blockData)).result

  })
})
