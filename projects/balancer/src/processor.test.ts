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

  test('test arb log2', async () => {
    // jest.setTimeout(100000)

    const logStr = "{\"address\":\"0xba12222222228d8ba445958a75a0704d566bf2c8\",\"topics\":[\"0x2170c741c41531aec20e7c107c24eecfdd15e69c9bb0a8dd37b1840b9e0b207b\",\"0xb286b923a4ed32ef1eae425e2b2753f07a517708000200000000000000000000\",\"0x000000000000000000000000040d1edc9569d4bab2d15287dc5a4f10f56a56b8\",\"0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1\"],\"data\":\"0x00000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000738c1bf3fff\",\"blockNumber\":\"0x36fb7\",\"transactionHash\":\"0x35480bee9351c942d4d7768752961f8eb89237d0c0566e3a4980bff9c51014e7\",\"transactionIndex\":\"0x0\",\"blockHash\":\"0x8c42cf9101bde844c3042dd4f04c93bc1381b3f0869d816b24e1e87df8c73279\",\"logIndex\":\"0x0\",\"removed\":false}"

    const res = await service.testLog(JSON.parse(logStr), 42161)
    console.log(JSON.stringify(res))
  })
})
