import { Counter, Gauge, toBigInteger } from '@sentio/sdk'
import { token } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { getGroVaultContract } from './types/grovault'
import { MetapoolProcessor, MetapoolContext } from './types/metapool'
import { StableConvexXPoolProcessor, StableConvexXPoolContext } from './types/stableconvexxpool'
import { UST_3CRV_POOL, UST_STRATEGY, GRO_VAULT, CRV3_POOL } from './constant'
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
const CRV3_DECIMAL = 18


const metapoolHandler = async function(block: Block, ctx: MetapoolContext) {
  const oneUst = 10n ** BigInt(UST_DECIMAL)
  const priceInDAI = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, DAI_INDEX, oneUst)), DAI_DECIMAL)
  const priceInUSDC = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, USDC_INDEX, oneUst)), USDC_DECIMAL)
  const priceInUSDT = scaleDown((await ctx.contract.get_dy_underlying(UST_INDEX, USDT_INDEX, oneUst)), USDT_DECIMAL)
  const priceInCRV3 = scaleDown((await ctx.contract.get_dy(UST_INDEX, 1, oneUst)), CRV3_DECIMAL)

  const ustAmoumt = scaleDown(await ctx.contract.balances(UST_INDEX), UST_DECIMAL)
  // when query balance of CRV3 index is 1
  const crv3Amoumt = scaleDown(await ctx.contract.balances(1), CRV3_DECIMAL)


  ctx.meter.Gauge('price_in_dai').record(priceInDAI)
  ctx.meter.Gauge('price_in_usdc').record(priceInUSDC)
  ctx.meter.Gauge('price_in_usdt').record(priceInUSDT)
  ctx.meter.Gauge('price_in_crv3').record(priceInCRV3)
  ctx.meter.Gauge('ust_amount').record(ustAmoumt)
  ctx.meter.Gauge('CRV_amount').record(crv3Amoumt)
}

const crv3poolHandler = async function(block: Block, ctx: MetapoolContext) {
  const oneUsdt = 10n ** BigInt(USDT_DECIMAL)
  const priceInDAI = scaleDown((await ctx.contract.get_dy_underlying(2, 0, oneUsdt)), DAI_DECIMAL)
  const priceInUSDC = scaleDown((await ctx.contract.get_dy_underlying(2, 1, oneUsdt)), USDC_DECIMAL)

  const daiAmount = scaleDown(await ctx.contract.balances(0), DAI_DECIMAL)
  const usdcAmount = scaleDown(await ctx.contract.balances(1), USDC_DECIMAL)
  const usdtAmount = scaleDown(await ctx.contract.balances(2), USDT_DECIMAL)

  ctx.meter.Gauge('crv3_usdt_to_dai').record(priceInDAI)
  ctx.meter.Gauge('crv3_usdt_to_usdc').record(priceInUSDC)
  ctx.meter.Gauge('crv3_dai_amount').record(daiAmount)
  ctx.meter.Gauge('crv3_usdc_amount').record(usdcAmount)
  ctx.meter.Gauge('crv3_usdt_amount').record(usdtAmount)
}

const stableConvexXPoolHandler = async function(block: Block, ctx: StableConvexXPoolContext) {
  const totalAssets = scaleDown(await ctx.contract.estimatedTotalAssets(), UST_DECIMAL)
  const vaultAddr = await ctx.contract.vault()
  const performance = await getGroVaultContract(vaultAddr).strategies(ctx.address, {blockTag: block.number})
  const totalDebt = scaleDown(performance[5], UST_DECIMAL)
  ctx.meter.Gauge('total_debt').record(totalDebt)
  ctx.meter.Gauge('total_assets').record(totalAssets)
  // only calc gain when debt is greater than a certain number to avoid huge gain when a pool is drawn
  if (totalDebt.gte(1000)) {
    const lossAndGain = totalAssets.div(totalDebt).minus(1)
    ctx.meter.Gauge('gain').record(lossAndGain)
  } else {
    ctx.meter.Gauge('gain').record(0)
  }
}

MetapoolProcessor.bind({address: UST_3CRV_POOL, startBlock: 14415127})
.onBlock(metapoolHandler)

MetapoolProcessor.bind({address: CRV3_POOL, startBlock: 14915127})
.onBlock(crv3poolHandler)

StableConvexXPoolProcessor.bind({address: UST_STRATEGY})
.onBlock(stableConvexXPoolHandler)