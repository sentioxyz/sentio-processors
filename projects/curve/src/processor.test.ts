import { TestProcessorServer } from '@sentio/sdk/testing'
import { HandlerType } from '@sentio/sdk'
import { Log } from '@ethersproject/abstract-provider'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=>import('./processor.js'),  {
    1: "https://eth-mainnet.g.alchemy.com/v2/SAow9F_73wmx_Uj5yEcI_au8y9GXYYd5",
  })

  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('test block', async () => {
    // const contract = getBenddistributorContract(1, '0x2338D34337dd0811b684640de74717B73F7B8059')
    // let x = await contract.totalClaimed('0x826eB237dAC0bC494cED68Fb93d3337a0379EEA1', { blockTag: 14643000 })
    // let y = await contract.claimable('0x826eB237dAC0bC494cED68Fb93d3337a0379EEA1', { blockTag: 14643000 })

    const res = await service.eth.testBlock({ ...blockData, number: 14643000 })

    // console.log(x,y)
  })
})


const blockData = {
  hash: '0x2b9b7cce1f17f3b7e1f3c2472cc806a07bee3f0baca07d021350950d81d73a42',
      parentHash: '0x2b9b7cce1f17f3b7e1f3c2472cc806a07bee3f0baca07d021350950d81d73a41',
    difficulty: 1n,
    number: 14373295,
    timestamp: 1647106437,
    extraData: '0xe4b883e5bda9e7a59ee4bb99e9b1bc493421',
    nonce: '0x689056015818adbe',
    gasLimit: 0n,
    gasUsed: 0n,
    miner: '0xbb7b8287f3f0a933474a79eae42cbca977791171',
    baseFeePerGas: null,
    transactions: [],
}