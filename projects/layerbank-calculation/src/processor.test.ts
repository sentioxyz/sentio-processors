import assert from 'assert'
import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  before(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    const config = await service.getConfig({})
    assert(config.contractConfigs.length > 0)
  })

  test('check transfer event handling', async () => {
    const resp = await service.eth.testLog(
      mockTransferLog('0x5300000000000000000000000000000000000004', {
        from: '0x0000000000000000000000000000000000000000',
        to: '0xb329e39ebefd16f40d38f07643652ce17ca5bac1',
        value: 10n ** 18n * 10n
      })
    )

    const tokenCounter = firstCounterValue(resp.result, 'token')
    assert.equal(tokenCounter, 10n)
  })
})
