import {TestProcessorServer} from '@sentio/sdk/testing'
import {HandlerType} from "@sentio/sdk";

describe('Test Processor', () => {
    const service = new TestProcessorServer(() => import('./processor.js'))

    beforeAll(async () => {
        await service.start()
    })

    test('has config', async () => {
        const config = await service.getConfig({})
        expect(config.contractConfigs.length > 0)
    })

})

