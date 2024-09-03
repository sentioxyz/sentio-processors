import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=> import('./processor.js'), {
    1: "https://eth-mainnet.g.alchemy.com/v2/xcYv7bcyPkul-4_ZtfZPAly_q5zxcNs3",
  })

  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('strange log', async () => {
    const logData = JSON.parse(
        "{\"address\":\"0x67df471eacd82c3dbc95604618ff2a1f6b14b8a1\",\"topics\":[\"0xd1055dc2c2a003a83dfacb1c38db776eab5ef89d77a8f05a3512e8cf57f953ce\",\"0x000000000000000000000000cf595641c40008fdc97e5ccbce710ab4d31539a3\",\"0x00000000000000000000000067df471eacd82c3dbc95604618ff2a1f6b14b8a1\"],\"data\":\"0x00000000000000000000000000000000000000000000000000000001c0b4ed5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002cdee488\",\"blockNumber\":\"0xc84bc2\",\"transactionHash\":\"0x391d4896a207217011d5c2194f4f7ecc34d0f3a2c7d4e473756298ba4b304aff\",\"transactionIndex\":\"0xac\",\"blockHash\":\"0xe14763cb0b0e1a08901ad8a5c426690d88cbd475bc643c1fd7d86f3d54d6001f\",\"logIndex\":\"0xd9\",\"removed\":false}\n"
    )
    let res = await service.eth.testLog(logData)
    console.log(JSON.stringify(res))
  })
})
