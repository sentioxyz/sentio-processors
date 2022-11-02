import { Counter, Gauge, toBigInteger } from '@sentio/sdk'
import { token } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { MetapoolProcessor, MetapoolContext } from './types/metapool'
import { UST_3CRV_POOL } from './constant'
import type { Block } from '@ethersproject/providers'
import { scaleDown } from '@sentio/sdk/lib/utils/token'

const tokenCounter = new Counter('token')
const UST_INDEX = 0
const DAI_INDEX = 1
const USDC_INDEX = 2
const USDT_INDEX = 3

const UST_DECIMAL = 6
const DAI_DECIMAL = 18
const USDC_DECIMAL = 6
const USDT_DECIMAL = 6
const CRV3_DECIMAL = 6


const metapoolHandler = async function(block: Block, ctx: MetapoolContext) {
  const oneUst = 10n ** BigInt(UST_DECIMAL)
  const priceInDAI = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, DAI_INDEX, oneUst)), DAI_DECIMAL)
  const priceInUSDC = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, USDC_INDEX, oneUst)), USDC_DECIMAL)
  const priceInUSDT = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, USDT_INDEX, oneUst)), USDT_DECIMAL)
  const priceInCRV3 = scaleDown((await ctx.contract.get_dy(UST_INDEX, 1, oneUst)), CRV3_DECIMAL)

  ctx.meter.Gauge('price_in_dai').record(priceInDAI)
  ctx.meter.Gauge('price_in_usdc').record(priceInUSDC)
  ctx.meter.Gauge('price_in_usdt').record(priceInUSDT)
  ctx.meter.Gauge('price_in_crv3').record(priceInCRV3)
}

MetapoolProcessor.bind({address: UST_3CRV_POOL})
.onBlock(metapoolHandler)
