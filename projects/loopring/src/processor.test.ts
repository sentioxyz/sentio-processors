import { TestProcessorServer } from '@sentio/sdk/lib/test'
import { Log } from '@ethersproject/abstract-provider'


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

  test('test log2', async () => {
    // jest.setTimeout(100000)
    const logStr = "{\"address\":\"0x0baba1ad5be3a5c0a66e7ac838a129bf948f1ea4\",\"topics\":[\"0x73ff7b101bcdc22f199e8e1dd9893170a683d6897be4f1086ca05705abb886ae\"],\"data\":\"0x0000000000000000000000007bc64c3adb29e12c209c94c02651efc806d527350000000000000000000000007bc64c3adb29e12c209c94c02651efc806d527350000000000000000000000009f8f72aa9304c8b593d555f12ef6589cc3a579a20000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000003685c5979a98c0020\",\"blockNumber\":\"0xad6577\",\"transactionHash\":\"0xe04d6b4d4a22fbe11947699a59935a8419f50b0c55d32c0963fde34ba5c00976\",\"transactionIndex\":\"0x6a\",\"blockHash\":\"0x11a1bc99c917ec83474caef32118bdb7831b7a2743b35980271d9bc493103856\",\"logIndex\":\"0x9a\",\"removed\":false}\n"
    const res = await service.testLog(JSON.parse(logStr))
    console.log(JSON.stringify(res))
  })

})
