import { Counter, Gauge, toBigInteger } from '@sentio/sdk'
import { MetapoolProcessor, MetapoolContext } from './types/metapool'
import { stETH_POOL } from './constant'
import type { Block } from '@ethersproject/providers'
import { scaleDown } from '@sentio/sdk/lib/utils/token'

const ETH_INDEX = 0
const STETH_INDEX = 1
const ETH_DECIMAL = 18
const ONE_ETH = 10n ** BigInt(ETH_DECIMAL)



const metapoolHandler = async function(block: Block, ctx: MetapoolContext) {

  const priceInETH = scaleDown((await ctx.contract.get_dy(STETH_INDEX, ETH_INDEX, ONE_ETH)), ETH_DECIMAL)

  const ethAmount = scaleDown(await ctx.contract.balances(ETH_INDEX), ETH_DECIMAL)
  const stethAmount = scaleDown(await ctx.contract.balances(STETH_INDEX), ETH_DECIMAL)


  ctx.meter.Gauge('steth_in_eth').record(priceInETH)
  ctx.meter.Gauge('eth_amount').record(ethAmount)
  ctx.meter.Gauge('steth_amount').record(stethAmount)
}

MetapoolProcessor.bind({address: stETH_POOL, startBlock: 14415127})
.onBlock(metapoolHandler)
