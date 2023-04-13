import { Counter, Gauge, scaleDown, toBigInteger } from '@sentio/sdk'
// import { token } from '@sentio/sdk/utils'
// import { ERC20Processor } from '@sentio/sdk/eth/builtin/erc20'
import { getGroVaultContract } from './types/eth/grovault.js'
import { MetapoolProcessor, MetapoolContext } from './types/eth/metapool.js'
import { StableConvexXPoolProcessor, StableConvexXPoolContext } from './types/eth/stableconvexxpool.js'
import { UST_3CRV_POOL, UST_STRATEGY, GRO_VAULT, CRV3_POOL, FRAX_POOL, TUSD_POOL, LUSD_POOL } from './constant.js'
import { Block } from 'ethers'

const DAI_INDEX = 1
const USDC_INDEX = 2
const USDT_INDEX = 3

const DAI_DECIMAL = 18
const USDC_DECIMAL = 6
const USDT_DECIMAL = 6
const CRV3_DECIMAL = 18

const generateCrvMetapoolHandler = function(name: string, decimal: number) {
  const metapoolHandler = async function(block: Block, ctx: MetapoolContext) {
    const oneU = 10n ** BigInt(decimal)
    const priceInDAI = (await ctx.contract.get_dy_underlying(0, DAI_INDEX, oneU)).scaleDown(DAI_DECIMAL)
    const priceInUSDC = (await ctx.contract.get_dy_underlying(0, USDC_INDEX, oneU)).scaleDown(USDC_DECIMAL)
    const priceInUSDT = (await ctx.contract.get_dy_underlying(0, USDT_INDEX, oneU)).scaleDown(USDT_DECIMAL)
    const priceInCRV3 = (await ctx.contract.get_dy(0, 1, oneU)).scaleDown(CRV3_DECIMAL)
  
    const stableAmoumt = (await ctx.contract.balances(0)).scaleDown(decimal)
    // when query balance of CRV3 index is 1
    const crv3Amoumt = (await ctx.contract.balances(1)).scaleDown(CRV3_DECIMAL)
  
  
    ctx.meter.Gauge('price_in_dai').record(priceInDAI, {name: name})
    ctx.meter.Gauge('price_in_usdc').record(priceInUSDC, {name: name})
    ctx.meter.Gauge('price_in_usdt').record(priceInUSDT, {name: name})
    ctx.meter.Gauge('price_in_crv3').record(priceInCRV3, {name: name})
    ctx.meter.Gauge('stable_amount').record(stableAmoumt, {name: name})
    ctx.meter.Gauge('CRV_amount').record(crv3Amoumt, {name: name})
  }
  return metapoolHandler
}

// const metapoolHandler = async function(block: Block, ctx: MetapoolContext) {
//   const oneUst = 10n ** BigInt(UST_DECIMAL)
//   const priceInDAI = (await ctx.contract.get_dy_underlying(UST_INDEX, DAI_INDEX, oneUst)).scaleDown(DAI_DECIMAL)
//   const priceInUSDC = (await ctx.contract.get_dy_underlying(UST_INDEX, USDC_INDEX, oneUst)).scaleDown(USDC_DECIMAL)
//   const priceInUSDT = (await ctx.contract.get_dy_underlying(UST_INDEX, USDT_INDEX, oneUst)).scaleDown(USDT_DECIMAL)
//   const priceInCRV3 = (await ctx.contract.get_dy(UST_INDEX, 1, oneUst)).scaleDown(CRV3_DECIMAL)

//   const ustAmoumt = (await ctx.contract.balances(UST_INDEX)).scaleDown(UST_DECIMAL)
//   // when query balance of CRV3 index is 1
//   const crv3Amoumt = (await ctx.contract.balances(1)).scaleDown(CRV3_DECIMAL)


//   ctx.meter.Gauge('price_in_dai').record(priceInDAI)
//   ctx.meter.Gauge('price_in_usdc').record(priceInUSDC)
//   ctx.meter.Gauge('price_in_usdt').record(priceInUSDT)
//   ctx.meter.Gauge('price_in_crv3').record(priceInCRV3)
//   ctx.meter.Gauge('ust_amount').record(ustAmoumt)
//   ctx.meter.Gauge('CRV_amount').record(crv3Amoumt)
// }

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

// const stableConvexXPoolHandler = async function(block: Block, ctx: StableConvexXPoolContext) {
//   const totalAssets = scaleDown(await ctx.contract.estimatedTotalAssets(), UST_DECIMAL)
//   const vaultAddr = await ctx.contract.vault()
//   const performance = await getGroVaultContract(ctx, vaultAddr).strategies(ctx.address, {blockTag: block.number})
//   const totalDebt = scaleDown(performance[5], UST_DECIMAL)
//   ctx.meter.Gauge('total_debt').record(totalDebt)
//   ctx.meter.Gauge('total_assets').record(totalAssets)
//   // only calc gain when debt is greater than a certain number to avoid huge gain when a pool is drawn
//   if (totalDebt.gte(1000)) {
//     const lossAndGain = totalAssets.div(totalDebt).minus(1)
//     ctx.meter.Gauge('gain').record(lossAndGain)
//   } else {
//     ctx.meter.Gauge('gain').record(0)
//   }
// }

MetapoolProcessor.bind({address: FRAX_POOL, startBlock: 15000000})
.onBlockInterval(generateCrvMetapoolHandler("FRAX", 18))

MetapoolProcessor.bind({address: TUSD_POOL, startBlock: 15000000})
.onBlockInterval(generateCrvMetapoolHandler("TUSD", 18))

MetapoolProcessor.bind({address: LUSD_POOL, startBlock: 15000000})
.onBlockInterval(generateCrvMetapoolHandler("LUSD", 18))

MetapoolProcessor.bind({address: LUSD_POOL, startBlock: 15000000})
.onBlockInterval(generateCrvMetapoolHandler("OUSD", 18))


// StableConvexXPoolProcessor.bind({address: UST_STRATEGY})
// .onBlockInterval(stableConvexXPoolHandler)
