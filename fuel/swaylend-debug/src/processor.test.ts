import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
import { FuelChainId } from "@sentio/chain"
import { Market } from "./types/fuel/Market.js";
import { getRpcEndpoint } from "@sentio/sdk/fuel"
import { Provider, Contract } from "fuels"

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'), {})

  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('test call', async () => {
    const provider = await Provider.create("https://testnet.fuel.network/v1/graphql")
    const contract = new Contract(
      "0x689bfaf54edfc433f62d06f3581998f9cb32ce864da5ff99f4be7bed3556529d",
      Market.abi,
      provider) as Market

    // const contract = new Market("0x689bfaf54edfc433f62d06f3581998f9cb32ce864da5ff99f4be7bed3556529d",provider)

    const res = await contract.functions.get_market_basics().get()
    console.log(JSON.stringify(res.value))
  })
})


