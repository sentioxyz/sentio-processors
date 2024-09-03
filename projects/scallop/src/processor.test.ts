import assert from 'assert'
// import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
// import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'

import { SuiNetwork } from "@sentio/sdk/sui"

import { getPriceByType, getPriceBySymbol } from '@sentio/sdk/utils'

describe('Test Processor', () => {
    // const service = new TestProcessorServer(() => import('./processor.js'))

    // before(async () => {
    //   await service.start()
    // })

    // test('has valid config', async () => {
    //   const config = await service.getConfig({})
    //   assert(config.contractConfigs.length > 0)
    // })

    test('getPriceByType', async () => {
        const date = new Date('2023-07-27T04:39:59')
        const price = await getPriceByType(SuiNetwork.MAIN_NET, "0x2::sui::SUI", date)
        console.log(`price of sui PriceByType: ${price}`)
    })

    test('getPriceBySymbol', async () => {
        const date = new Date('2023-07-27T04:39:59')
        const price = await getPriceBySymbol("SUI", date)
        console.log(`sui PriceBySymbol: ${price}`)
    })

    test('output anything', async () => {
        console.log(`output anything`)
    })

    // test('check transfer event handling', async () => {
    //   const resp = await service.eth.testLog(
    //     mockTransferLog('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9', {
    //       from: '0x0000000000000000000000000000000000000000',
    //       to: '0xb329e39ebefd16f40d38f07643652ce17ca5bac1',
    //       value: 10n ** 18n * 10n,
    //     })
    //   )
    //
    //   const tokenCounter = firstCounterValue(resp.result, 'token')
    //   expect(tokenCounter).equals(10n)
    // })

    // test('check transaction block', async () => {
    //   const resp = await service.sui.testEvent(txdata.result as any, SuiNetwork.TEST_NET)
    //   console.log(resp)
    // })
})

