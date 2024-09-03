import assert from 'assert'
import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
// import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'
// import { mockTradeLog} from "./types/eth/internal/symbolmanagerimplementation-test-utils.js";
import {EthChainId} from "@sentio/sdk/eth";
describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'), {56: "https://bsc-mainnet.blastapi.io/dca2d284-1aea-495f-a50e-7750acdc2ec1"})

  before(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    const config = await service.getConfig({})
    assert(config.contractConfigs.length > 0)
  })

  test('check transfer event handling', async () => {
    const json = { address: '0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E', blockHash: '0x62b8f4d1dd1f05bfe6974363103b7818b84a169463605c6e13b337ff6d821198', blockNumber: 14689158, data: '0x00000000000000000000000094a6de2a192ca8a4e574229c503b816441a37674', index: 489, removed: false, topics: [ '0x6b70829fcbe4891157f7a7496f9870927de3c8237adbe9cd39bae09b7382c409' ], transactionHash: '0xd8349ee3cecfd6ad898ad12201eeed117303567bc1a92a88e6cffa8685962f6e', transactionIndex: 157}

    const json2 = { address: '0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E', blockHash: '0x5e850c1c5be96aa9f35355e86f7082d37e573b5021370050f8054dac1c66955f', blockNumber: 27202498, data: '0x0000000000000012725dd1d243aba0e75fe645cc4873f9e65afe688c928e1f210000000000000000000000000000000000000000000004f371ed8ddecdb2e4fa', index: 198, removed: false, topics: [ '0x6268ec35156e32a8b0ad0e6385e99c991e7c59a0138ff4efcd43353716b940aa', '0x0000000000000000000000000000000000000000000000000000000000000092', '0x0000000000000000000000000000000000000000000000000000000000000000' ], transactionHash: '0x863f698f2aa4951b77bd7b0d8735fe57e0b3765476bd5f350130e3d96c0fde21', transactionIndex: 80}

    const json3 = { address: '0x543A9FA25ba9a16612274DD707Ac4462eD6988FA', blockHash: '0xd624f2c667c139097561cf44e36e3905ca3181d89b9b8fb04e88e25482615269', blockNumber: 14685598, data: '0x0000000000000000000000000000000000000000000007bd14d108f0d6b20000fffffffffffffffffffffffffffffffffffffffffffffffff90fa4a62c4e0000ffffffffffffffffffffffffffffffffffffffffffffff94734aea5eb20a1e3b000000000000000000000000000000000000000000000000fd9412908121a000', index: 141, removed: false, topics: [ '0x41b67270be77b6697f63cec5340a4d9734ace321f049d79e1c47cc1261fd66fb', '0x0000000000000000000000000000000000000000000000000000000000000020', '0x6b3e0125f3c1d32fc6716d071060ab2529e24d9da611c14a60fe47e502320d1f' ], transactionHash: '0x8ce5d7c7bd84ccacf1a1dce6bde237941604824e627cc85fb95a7b99754eda74', transactionIndex: 92}

    const json4 = { address: '0x543A9FA25ba9a16612274DD707Ac4462eD6988FA', blockHash: '0x8f1e191f5d416f2f19453cb90c689ca7155117dc4403ec455d8a88d099da6af3', blockNumber: 13930278, data: '0x0000000000000000000000006e3c29197064ffb48d09fc44cf7c0fb32f06dae6', index: 220, removed: false, topics: [ '0x6b70829fcbe4891157f7a7496f9870927de3c8237adbe9cd39bae09b7382c409' ], transactionHash: '0x1d2a0e529f4a0836f6884b106a3ed9b5486beb6370e6dd4162896e94cd4b0ae2', transactionIndex: 67}

    const resp = await service.eth.testLog(json4, EthChainId.BINANCE)

      // mockTransferLog('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9', {
      //   from: '0x0000000000000000000000000000000000000000',
      //   to: '0xb329e39ebefd16f40d38f07643652ce17ca5bac1',
      //   value: 10n ** 18n * 10n,
      // })
    // )

    // const tokenCounter = firstCounterValue(resp.result, 'token')
    // expect(tokenCounter).equals(10n)
  })
})
