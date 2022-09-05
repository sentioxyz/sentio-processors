import { TestProcessorServer } from '@sentio/sdk/test'

describe('Test Processor', () => {
  const service = new TestProcessorServer()

  beforeAll(async () => {
    service.setup({
      1: "https://eth-mainnet.alchemyapi.io/v2/Gk024pFA-64RaEPIawL40n__1esXJFb2",
      137: "https://polygon-mainnet.g.alchemy.com/v2/PUmsfnPGKTkniNFyFEdSCYWynusFCVGt",
      42161: "https://arb-mainnet.g.alchemy.com/v2/o-n6wzGm51SAbuAupiq43Y1U6g6CKfxa"
    })
    require('./processor')
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('test arb log', async () => {
    // jest.setTimeout(100000)
    const logStr = "{\"address\":\"0xba12222222228d8ba445958a75a0704d566bf2c8\",\"topics\":[\"0x18e1ea4139e68413d7d08aa752e71568e36b2c5bf940893314c2c5b01eaa0c42\",\"0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045\",\"0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1\"],\"data\":\"0x000000000000000000000000000000000000000000000000000000000000a455\",\"blockNumber\":\"0x36759\",\"transactionHash\":\"0x290b613a70b7d926520456925bfd7b35c74d858908485a8fd7d6b1b991000ac8\",\"transactionIndex\":\"0x0\",\"blockHash\":\"0x24e6fc021f3a6484df9879da11a6c65cec27744398e90906cd91cbb3248f2fa2\",\"logIndex\":\"0x0\",\"removed\":false}"

    const res = await service.testLog(JSON.parse(logStr), 42161)
    console.log(JSON.stringify(res))
  })
})
