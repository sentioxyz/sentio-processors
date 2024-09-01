import {TestProcessorServer} from '@sentio/sdk/testing'
import {HandlerType} from "@sentio/sdk";
import fetch from "node-fetch";

describe('Test Processor', () => {
    const service = new TestProcessorServer(() => import('./processor.js'))

    before(async () => {
        await service.start()
    })

    test('has config', async () => {
        const config = await service.getConfig({})
        expect(config.contractConfigs.length > 0)
    })

    test('test fetch', async () => {
        let res = await fetch("https://cni63qije4c4wufvtgsaynshb64elqjjbse4gbbj377gedhdvz4q.arweave.net/E1HtwQknBctQtZmkDDZHD7hFwSkMicMEKd_-Ygzjrnk")
        const json = await res.json() as any

        console.log(json.name)

    })
})

