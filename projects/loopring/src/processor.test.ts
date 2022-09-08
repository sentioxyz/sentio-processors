import { TestProcessorServer } from '@sentio/sdk/test'

describe('Test Processor', () => {
  const service = new TestProcessorServer()

  beforeAll(async () => {
    service.setup({
      1: "https://eth-mainnet.alchemyapi.io/v2/Gk024pFA-64RaEPIawL40n__1esXJFb2",
    })
    require('./processor')
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('test log', async () => {
    // jest.setTimeout(100000)
    const logStr = "{\"address\":\"0x57e037f4d2c8bea011ad8a9a5af4aaeed508650f\",\"topics\":[\"0x5b03bfed1c14a02bdeceb5fa582eb1a5765fc0bc64ca0e6af4c20afc9487f081\"],\"data\":\"0x00000000000000000000000093269483a70c68d5c5bb63aac1e8f4ac59f498800000000000000000000000000c520e51c055cf63bab075715c1b860b2e9b8e24\",\"blockNumber\":\"0xc9d6d7\",\"transactionHash\":\"0x208af3250499672c2f07138b9aa236153c65c78ae4341b23c2763017afdd61a2\",\"transactionIndex\":\"0xf3\",\"blockHash\":\"0x6e3b100c34b510049e922fbe1c1dab1b0793be3d1229b632688e6a518cdd11b6\",\"logIndex\":\"0x14b\",\"removed\":false}"
    const res = await service.testLog(JSON.parse(logStr))
    console.log(JSON.stringify(res))
  })

})
