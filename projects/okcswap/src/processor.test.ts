import { TestProcessorServer } from '@sentio/sdk/testing'
import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })



  test('test log getERC20Token', async () => {
    // jest.setTimeout(100000)
    const logStr = "{\"address\":\"0x39bd57b490af6cd5333490e4d8cc949ab3187cde\",\"topics\":[\"0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822\"],\"data\":\"0x0000000000000000000000007bc64c3adb29e12c209c94c02651efc806d527350000000000000000000000007bc64c3adb29e12c209c94c02651efc806d527350000000000000000000000009f8f72aa9304c8b593d555f12ef6589cc3a579a20000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000003685c5979a98c0020\",\"blockNumber\":\"0xad6577\",\"transactionHash\":\"0xe04d6b4d4a22fbe11947699a59935a8419f50b0c55d32c0963fde34ba5c00976\",\"transactionIndex\":\"0x6a\",\"blockHash\":\"0x11a1bc99c917ec83474caef32118bdb7831b7a2743b35980271d9bc493103856\",\"logIndex\":\"0x9a\",\"removed\":false}\n"
    const res = await service.eth.testLog(JSON.parse(logStr))
    console.log(JSON.stringify(res))
  })

})
