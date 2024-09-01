import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
import { HandlerType } from '@sentio/sdk'
import { Log } from '@ethersproject/abstract-provider'

describe('Test Processor', () => {
  const service = new TestProcessorServer(()=>import('./processor.js'),  {
    1: "https://eth-mainnet.g.alchemy.com/v2/SAow9F_73wmx_Uj5yEcI_au8y9GXYYd5",
  })

  before(async () => {
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

    // const res = await service.eth.testBlock({ ...blockData, number: 15000001 })

    const res = await service.eth.testTrace(trace_data as any)
    // console.log(x,y)
  })
})


const trace_data = {"blockNumber":16073444,"traceAddress":[1,0,1,1],"transactionHash":"0xdf8771d53c521eaaf0ad1d7f75924bd9570f95f4a2bc6fe3d1c754e120401748","action":{"init":"0x","input":"0x5a0998430000000000000000000000000000000000000000638593230000000000016351000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000bb289bc97591f70d8216462df40ed713011b968a0000000000000000000000003b17056cc4439c61cea41fe1c9f517af75a978f700000000000000000000000000000000000000000000000000000000226c8ca600000000000000000000000000000000000000000000000006aa429f22e46040000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000006aa429f22e460260000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000417f86bbf7ba087cc506295ebbf25a17de04e4f6a8104869ca3b7b3df5b7a5e64773d2748abaedf4e598b220ad15eee21287322d3d1a6bf091c9eda0b5c9f0bc291b00000000000000000000000000000000000000000000000000000000000000","to":"0x1111111254eeb25477b68fb85ed929f73a960582","value":"0x0","callType":"call","from":"0x3b17056cc4439c61cea41fe1c9f517af75a978f7","gas":"0x1fab3"},"blockHash":"0x88690ca61cf6343e678321d7afa85b51ee2571ce38f031e937800840c984bf3b","result":{"gasUsed":"0x14fde","output":"0x00000000000000000000000000000000000000000000000000000000226c8ca500000000000000000000000000000000000000000000000006aa429f22e460265eb87d993e4b52ce0bd5ccb1c51cec775606febd77a7a8e24ee35ac3a17977e5"},"subtraces":2,"transactionPosition":183,"type":"call","name":"fillOrderRFQTo","functionSignature":"fillOrderRFQTo((uint256,address,address,address,address,uint256,uint256),bytes,uint256,address)","args":[["30800497939830931901670056785","0xdAC17F958D2ee523a2206206994597C13D831ec7","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","0xBB289bC97591F70D8216462DF40ED713011B968a","0x3B17056cc4439c61ceA41Fe1c9f517Af75A978F7","577539238","480269561521004608"],"0x7f86bbf7ba087cc506295ebbf25a17de04e4f6a8104869ca3b7b3df5b7a5e64773d2748abaedf4e598b220ad15eee21287322d3d1a6bf091c9eda0b5c9f0bc291b","480269561521004582","0x1111111254fb6c44bAC0beD2854e76F90643097d"]}