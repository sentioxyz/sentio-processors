import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./clutchy.js'))

  before(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    // const config = await service.getConfig({})
    // assert(config.contractConfigs.length > 0)
  })
})
