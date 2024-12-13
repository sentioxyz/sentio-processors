import assert from 'assert'
import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
import { SuiNetwork } from "@sentio/sdk/sui"
import { getPriceByType, getPriceBySymbol } from '@sentio/sdk/utils'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  before(async () => {
    await service.start()
  })

  test('getPriceByType', async () => {
    const date = new Date('2023-05-08T04:39:59')
    const price = await getPriceByType(SuiNetwork.MAIN_NET, "0x2::sui::SUI", date)
    console.log(`price of sui: ${price}`)
  })


  test('getPriceBySymbol', async () => {
    const date = new Date('2023-05-08T04:39:59')
    const price = await getPriceBySymbol("SUI", date)
    console.log(`sui PriceBySymbol: ${price}`)
  })

})
