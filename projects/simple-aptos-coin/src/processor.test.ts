import assert from 'assert'
import { before, describe, test } from 'node:test'
import {TestProcessorServer} from '@sentio/sdk/testing'
import {HandlerType} from "@sentio/sdk";

describe('Test Processor', () => {
    const service = new TestProcessorServer(() => import('./processor.js'))

    before(async () => {
        await service.start()
    })

    test('has config', async () => {
        const config = await service.getConfig({})
        assert(config.contractConfigs.length > 0)
    })

})
