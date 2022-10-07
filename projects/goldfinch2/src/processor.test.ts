import { TestProcessorServer } from '@sentio/sdk/lib/testing'
import { mockCreditLineCreatedLog } from "./types/goldfinchfactory/test-utils";

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=> require('./processor'), {
    1: "https://eth-mainnet.g.alchemy.com/v2/SAow9F_73wmx_Uj5yEcI_au8y9GXYYd5",
  })
  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('Check block dispatch', async () => {
    // const evt = mockCreditLineCreatedLog(
    //     "0xd20508E1E971b80EE172c73517905bfFfcBD87f9", {
    //       creditLine: "0xxxxxxx"
    //     }
    // )
    //

    const blockData = {
      hash: '0x2b9b7cce1f17f3b7e1f3c2472cc806a07bee3f0baca07d021350950d81d73a42',
      number: 13941061,
      timestamp: 1647106437,
      extraData: '0xe4b883e5bda9e7a59ee4bb99e9b1bc493421',
    }

    const res = (await service.testBlock(blockData)).result

  })
})
