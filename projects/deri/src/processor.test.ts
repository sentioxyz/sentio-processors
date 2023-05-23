import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
// import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'
// import { mockTradeLog} from "./types/eth/internal/symbolmanagerimplementation-test-utils.js";
import {EthChainId} from "@sentio/sdk";
import { jest } from '@jest/globals'
jest.setTimeout(100000)
describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'), {56: "https://bsc-mainnet.blastapi.io/dca2d284-1aea-495f-a50e-7750acdc2ec1"})

  beforeAll(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0).toBeTruthy()
  })

  test('check transfer event handling', async () => {
    const json = { address: '0x543A9FA25ba9a16612274DD707Ac4462eD6988FA', blockHash: '0x1e30ce22de8b62ec667f192fe6e9655ea9690199765a6834b434709ed52ccaa8', blockNumber: 14349154, data: '0x00000000000000000000000000000000000000000000090e53ec1a23ed500000ffffffffffffffffffffffffffffffffffffffffffffffffe56b7ccc35b1c000ffffffffffffffffffffffffffffffffffffffffffffffcd741a8ca21a4ccf49000000000000000000000000000000000000000000000000c21933a68749167d', index: 81, removed: false, topics: [ '0x41b67270be77b6697f63cec5340a4d9734ace321f049d79e1c47cc1261fd66fb', '0x0000000000000000000000000000000000000000000000000000000000000011', '0x6b3e0125f3c1d32fc6716d071060ab2529e24d9da611c14a60fe47e502320d1f' ], transactionHash: '0xbe52e5681316371e98ba20e1e555031401d78858d8008dfac26b5cff70b8cf82', transactionIndex: 29}

    const resp = await service.eth.testLog(json, EthChainId.BINANCE)

      // mockTransferLog('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9', {
      //   from: '0x0000000000000000000000000000000000000000',
      //   to: '0xb329e39ebefd16f40d38f07643652ce17ca5bac1',
      //   value: 10n ** 18n * 10n,
      // })
    // )

    // const tokenCounter = firstCounterValue(resp.result, 'token')
    // expect(tokenCounter).toEqual(10n)
  })
})
