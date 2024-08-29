import { before, describe, test } from 'node:test'
import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/lib/testing'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=> require('./processor'))

  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    assert.ok(config.contractConfigs.length > 0)
  })
})
