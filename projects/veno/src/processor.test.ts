import { before, describe, test } from 'node:test'
import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/testing'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=> import('./processor.js'))

  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    assert.ok(config.contractConfigs.length > 0)
  })
})
