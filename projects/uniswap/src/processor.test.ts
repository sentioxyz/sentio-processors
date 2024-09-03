import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'

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

    const x = await service.eth.testTrace(data)
    console.log(x)
    // expect(tokenCounter).equals(10n)
  })
})

const data = {"result":{"gasUsed":0x105ed,"output":"0xfffffffffffffffffffffffffffffffffffffffffffffffffffff279ca85f053000000000000000000000000000000000000000000000000000000019344bd98"},"subtraces":4,"blockNumber":12500078,"traceAddress":[5,1],"transactionHash":"0xb94077f5ec5e9468213e018728d58bf5b0116b927e51e58627465816beca81fb","transactionPosition":9,"type":"call","action":{"callType":"call","from":"0x0000000000007f150bd6f54c40a34d7c3d5e9f56","gas":0x45014,"init":"0x","input":"0x128acb08000bb800000000000000000055d5c232d921b9eaa6b37b5845e439acd04b4dba0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000019344bd98000000000000000000000000fffd8963efd1fc6a506488495d951d5263988d2500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002c2b591e99afe9f32eaa6214f7b7629768c40eeb39a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000bb800","to":"0x69d91b94f0aaf8e8a2586909fa77a5c2c89818d5","value":0x0},"blockHash":"0xc4e67ddcd1b5e93b79fa0f07fd2cdb25077a430b4a92e7be30db6322de8beac1"}
