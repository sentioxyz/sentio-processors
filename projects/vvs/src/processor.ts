import { VVSPairContext, VVSPairProcessor, SwapEvent, VVSPairProcessorTemplate, getVVSPairContractOnContext, TransferEvent } from "./types/eth/vvspair.js";
import { BigDecimal, Gauge } from "@sentio/sdk"
import { EthChainId } from "@sentio/sdk/eth";
import { getPriceByType,  token } from "@sentio/sdk/utils"
import { ERC20Context, ERC20Processor, getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { VVSFactoryProcessor, VVSFactoryContext, PairCreatedEvent } from "./types/eth/vvsfactory.js";
import { CORE_POOLS } from "./constant.js";
import { ContractContext, EthContext, TypedCallTrace } from "@sentio/sdk/eth";
import { CraftsmanContext, CraftsmanProcessor, DepositEvent, getCraftsmanContractOnContext, WithdrawEvent } from "./types/eth/craftsman.js";
interface poolInfo {
  token0: token.TokenInfo
  token1: token.TokenInfo
  token0Address: string
  token1Address: string
  poolName: string
  // fee: string
}

let poolInfoMap = new Map<string, Promise<poolInfo>>()

let pidMap = new Map<bigint, string>()

async function getPoolAddress(pid: bigint, ctx: EthContext) {
  if (!pidMap.get(pid)) {
    const craftsmanContract = getCraftsmanContractOnContext(ctx, ctx.address)
    const pool = await craftsmanContract.poolInfo(pid)
    pidMap.set(pid, pool.lpToken.toLowerCase())
    return pool.lpToken.toLowerCase()
  } else {
    return pidMap.get(pid)!
  }
}

const VVS_DECIMAL = 18


export const gaugeOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

export const vol = Gauge.register("vol", gaugeOptions)
export const fee = Gauge.register("fee", gaugeOptions)
const fee_rate = 0.003



const dummyPoolInfo = {
  token0Address: "",
  token1Address: "",
  poolName: "",
  token0: {
    symbol: "",
    name: "",
    decimal: 0
  },
  token1: {
    symbol: "",
    name: "",
    decimal: 0
  }
}

async function buildPoolInfo(token0Promise: Promise<string>,
  token1Promise: Promise<string>): Promise<poolInfo> {
  try {
    const address0 = await token0Promise
    const address1 = await token1Promise
    const tokenInfo0 = await getTokenInfo(address0)
    const tokenInfo1 = await getTokenInfo(address1)
    return {
      token0: tokenInfo0,
      token1: tokenInfo1,
      token0Address: address0,
      token1Address: address1,
      poolName: tokenInfo0.symbol + "-" + tokenInfo1.symbol
      // fee: (await feePromise).toString(),
    }
  } catch (e) {
    return dummyPoolInfo
  }
}

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    return await token.getERC20TokenInfo(EthChainId.CRONOS, address)
  } else {
    return token.NATIVE_ETH
  }
}

const getOrCreatePool = async function (ctx: VVSPairContext) :Promise<poolInfo> {
  let infoPromise = poolInfoMap.get(ctx.address)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx.contract.token0(), ctx.contract.token1())
    poolInfoMap.set(ctx.address, infoPromise)
    console.log("set poolInfoMap for " + ctx.address)
  }
  return await infoPromise
  }

  const getOrCreatePoolForCraftsman = async function (poolAddress: string, ctx: CraftsmanContext) :Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(poolAddress)
    if (!infoPromise) {
      let poolContract = getVVSPairContractOnContext(ctx, poolAddress)
      const token0 = poolContract.token0()
      const token1 = poolContract.token1()
      infoPromise = buildPoolInfo(token0, token1)
      poolInfoMap.set(ctx.address, infoPromise)
      console.log("set poolInfoMap for " + ctx.address)
    }
    return await infoPromise
  }

async function getUsdValue(ctx: VVSPairContext | CraftsmanContext, info: token.TokenInfo, token :string, amount: BigDecimal): Promise<BigDecimal> {
  const price = await getPriceByType(EthChainId.CRONOS, token, ctx.timestamp) || 0
  return amount.multipliedBy(price)
}

async function getTokenAmount(ctx: VVSPairContext | CraftsmanContext, info: token.TokenInfo, token :string, balance: BigDecimal): Promise<BigDecimal> {	
  const price = await getPriceByType(EthChainId.CRONOS, token, ctx.timestamp) || 0	
  if (price != 0) {	
    return balance.div(price)	
  }	
  return BigDecimal(0)	
}

function maxBigInt(a: BigInt, b: BigInt): BigInt {
  return a > b ? a : b;
}

async function onSwap(evt: SwapEvent, ctx: VVSPairContext) {
  try {
  const poolInfo = await getOrCreatePool(ctx)
  const amount0 = maxBigInt(evt.args.amount0In, evt.args.amount0Out).scaleDown(poolInfo.token0.decimal)
  const amount1 = maxBigInt(evt.args.amount1In, evt.args.amount1Out).scaleDown(poolInfo.token1.decimal)
  const price0 = await getPriceByType(EthChainId.CRONOS, poolInfo.token0Address, ctx.timestamp) || 0
  const price1 = await getPriceByType(EthChainId.CRONOS, poolInfo.token1Address, ctx.timestamp) || 0
  const usd0 = await getUsdValue(ctx, poolInfo.token0, poolInfo.token0Address, amount0)
  // const usd1 = await getUsdValue(ctx, poolInfo.token1, poolInfo.token0Address, amount1)
  const sender = evt.args.sender
  let exchangePrice: BigDecimal
  if (amount1.eq(0)) {
    exchangePrice = BigDecimal(-1)
  } else {
    exchangePrice = amount0.div(amount1)
  }
  let exchangePriceGeicko: number
  let priceDiff = BigDecimal(-1)
  if (price0 == 0) {
    exchangePriceGeicko = -1
  } else {
    exchangePriceGeicko = price1/price0
  }

  if (exchangePriceGeicko > 0 && exchangePrice.gt(0)) {
    priceDiff = exchangePrice.div(exchangePriceGeicko).minus(1).abs()
  }
  vol.record(ctx, usd0, {
    poolName: poolInfo.poolName,
    token0: poolInfo.token0.symbol,
    token1: poolInfo.token1.symbol,
    token_symbol: poolInfo.token0.symbol,
    pool: ctx.address.toLowerCase()
  })

  fee.record(ctx, usd0.multipliedBy(fee_rate), {
    poolName: poolInfo.poolName,
    token0: poolInfo.token0.symbol,
    token1: poolInfo.token1.symbol,
    token_symbol: poolInfo.token0.symbol,
    pool: ctx.address.toLowerCase()
  })

  ctx.meter.Gauge("exchangePrice").record(exchangePrice, {
    poolName: poolInfo.poolName,
    token0: poolInfo.token0.symbol,
    token1: poolInfo.token1.symbol,
    token_symbol: poolInfo.token0.symbol
  })

  ctx.eventLogger.emit("Swap", {
    message: `${sender} swapped ${amount0} ${poolInfo.token0.symbol} for ${amount1} ${poolInfo.token1.symbol}`,
    sender: sender,
    token0: poolInfo.token0.symbol,
    token1: poolInfo.token1.symbol,
    amount0: amount0,
    amount1: amount1,
    exchangePrice: exchangePrice,
    exchangePriceGeicko: exchangePriceGeicko,
    priceDiff: priceDiff,
    usd0,
    poolName: poolInfo.poolName,
  })
} catch (e) {
  console.log(e)
}
}
async function onTransfer(evt: TransferEvent, ctx: VVSPairContext) {
  const from = evt.args.from
  const to = evt.args.to
  const pool = evt.address

}

	
async function priceSlippageHandler(_:any, ctx: VVSPairContext) {	
  try {	
  const poolInfo = await getOrCreatePool(ctx)	
  const reserves = await ctx.contract.getReserves()	
  // const balance0 = (await getERC20Contract(ctx.chainId, poolInfo.token0Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token0.decimal)	
  // const balance1 = (await getERC20Contract(ctx.chainId, poolInfo.token1Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token1.decimal)	
  for (let i = 2; i < 5 ; i++) {	
    const usdAmount = Math.pow(10, i)	
    const price0 = await getPriceByType(EthChainId.CRONOS, poolInfo.token0Address, ctx.timestamp) || 0	
    const price1 = await getPriceByType(EthChainId.CRONOS, poolInfo.token1Address, ctx.timestamp) || 0	
    if (price0 == 0) return	
    const amount0 = BigDecimal(usdAmount/price0).multipliedBy(Math.pow(10, poolInfo.token0.decimal))	
    const amount1 = getAmountOut(amount0, reserves._reserve0.asBigDecimal(), reserves._reserve1.asBigDecimal())	
    let exchangePrice: BigDecimal	
    if (amount1.eq(0)) {	
      exchangePrice = BigDecimal(-1)	
    } else {	
      exchangePrice = amount0.div(Math.pow(10, poolInfo.token0.decimal)).div(amount1.div(Math.pow(10, poolInfo.token1.decimal)))	
    }	
    let exchangePriceGeicko: number	
    let priceDiff = BigDecimal(-1)	
    if (price0 == 0) {	
      exchangePriceGeicko = -1	
    } else {	
      exchangePriceGeicko = price1/price0	
    }	
  	
    if (exchangePriceGeicko > 0 && exchangePrice.gt(0)) {	
      priceDiff = exchangePrice.div(exchangePriceGeicko).minus(1).abs()	
    }	
    ctx.eventLogger.emit("priceSlippage", {	
      priceDiff,	
      amount0,	
      amount1,	
      usdAmount,	
      exchangePriceGeicko,	
      exchangePrice,	
      reserve0: reserves._reserve0,	
      reserve1: reserves._reserve1,	
      token0: poolInfo.token0.symbol,	
      token1: poolInfo.token1.symbol,	
      pairName: poolInfo.token0.symbol+"-"+poolInfo.token1.symbol	
    })	
  }	
} catch (e) {	
  console.log(e)	
}	
}	
// recreate the following logic with fee	
function getAmountOut(amountIn: BigDecimal, reserveIn: BigDecimal, reserveOut: BigDecimal) {	
  if (amountIn.lte(0) || reserveIn.lte(0)) {	
    return BigDecimal(0)	
  }	
  const numerator = reserveOut.multipliedBy(amountIn)	
  const denominator = reserveIn.plus(amountIn)	
  return numerator.div(denominator)	
}	

async function blockHandler(_:any, ctx: VVSPairContext) {
  try {
  const poolInfo = await getOrCreatePool(ctx)
  const balance0 = (await getERC20Contract(ctx.chainId, poolInfo.token0Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token0.decimal)
  const balance1 = (await getERC20Contract(ctx.chainId, poolInfo.token1Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token1.decimal)

  const tvl0 = await getUsdValue(ctx, poolInfo.token0, poolInfo.token0Address, balance0)
  const tvl1 = await getUsdValue(ctx, poolInfo.token1, poolInfo.token1Address, balance1)

  ctx.meter.Gauge("tvl").record(tvl0, {
    token: poolInfo.token0Address,
    symbol: poolInfo.token0.symbol,
    poolName: poolInfo.poolName
  })
  ctx.meter.Gauge("tvl").record(tvl1, {
    token: poolInfo.token1Address,
    symbol: poolInfo.token1.symbol,
    poolName: poolInfo.poolName
  })
  const totalSupply = await ctx.contract.totalSupply()
  const lpPrice = tvl0.plus(tvl1).div(totalSupply.asBigDecimal())
  ctx.meter.Gauge("lpPrice").record(lpPrice, {pool: ctx.address})
} catch (e) {
  console.log(e)
}
}

async function craftsmanHandler(_:any, ctx: CraftsmanContext) {
  try {
  const craftsmanContract = getCraftsmanContractOnContext(ctx, ctx.address)
  const totalAllocPoint = await craftsmanContract.totalAllocPoint()
  const poolNumber = await craftsmanContract.poolLength()
  const vvsPerBlockTotal = (await craftsmanContract.vvsPerBlock()).scaleDown(VVS_DECIMAL)
  for (var i = 0; i < poolNumber; i++) {
    const poolInfo = await craftsmanContract.poolInfo(i)
    const poolAddress = poolInfo.lpToken.toLowerCase()
    const allocPoint = poolInfo.allocPoint
    const pool = await getOrCreatePoolForCraftsman(poolAddress, ctx)
    const vvsPerBlock = vvsPerBlockTotal.multipliedBy(allocPoint.asBigDecimal()).div(totalAllocPoint.asBigDecimal())
    ctx.meter.Gauge("vvsPerBlock").record(vvsPerBlock, {id: i.toString(), pool: poolAddress, poolName: pool.poolName, coin_symbol: "VVS"})
  }
} catch (e) {
  console.log(e)
}
}

async function onCraftsmanDeposit(evt: DepositEvent, ctx: CraftsmanContext) {
  try {
  const amount = evt.args.amount
  const user = evt.args.user
  const pid = evt.args.pid
  const pool = await getPoolAddress(pid, ctx)

  // const craftsmanContract = getCraftsmanContractOnContext(ctx, ctx.address)
  // const pool = await craftsmanContract.poolInfo(pid)
  // const poolAddress = pool.lpToken
  
  // const poolInfo = await getOrCreatePoolForCraftsman(poolAddress, ctx)
  // const balance0 = (await getERC20Contract(ctx.chainId, poolInfo.token0Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token0.decimal)
  // const balance1 = (await getERC20Contract(ctx.chainId, poolInfo.token1Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token1.decimal)

  // const tvl0 = await getUsdValue(ctx, poolInfo.token0, poolInfo.token0Address, balance0)
  // const tvl1 = await getUsdValue(ctx, poolInfo.token1, poolInfo.token1Address, balance1)

  ctx.eventLogger.emit("CraftsmanDeposit", {
    lpAmount: amount,
    user,
    pid,
    pool
    // poolAddress,
    // totalTVL: (tvl0.plus(tvl1)),
    // tvl0: tvl0,
    // tvl1: tvl1,
  })
  ctx.eventLogger.emit("CraftsmanBalance", {
    lpAmount: amount,
    user,
    pid,
    pool
    // poolAddress,
    // totalTVL: (tvl0.plus(tvl1)),
    // tvl0: tvl0,
    // tvl1: tvl1,
  })
} catch (e) {
  console.log(e)
}
}

async function onCraftsmanWithdraw(evt: WithdrawEvent, ctx: CraftsmanContext) {
  try{
  const amount = evt.args.amount
  const user = evt.args.user
  const pid = evt.args.pid

  const pool = await getPoolAddress(pid, ctx)
  
  // const poolInfo = await getOrCreatePoolForCraftsman(poolAddress, ctx)
  // const balance0 = (await getERC20Contract(ctx.chainId, poolInfo.token0Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token0.decimal)
  // const balance1 = (await getERC20Contract(ctx.chainId, poolInfo.token1Address).balanceOf(ctx.address, {blockTag: ctx.blockNumber})).scaleDown(poolInfo.token1.decimal)

  // const tvl0 = await getUsdValue(ctx, poolInfo.token0, poolInfo.token0Address, balance0)
  // const tvl1 = await getUsdValue(ctx, poolInfo.token1, poolInfo.token1Address, balance1)

  ctx.eventLogger.emit("CraftsmanWithdraw", {
    lpAmount: amount,
    user,
    pid,
    pool
    // poolAddress,
    // totalTVL: -(tvl0.plus(tvl1)),
    // tvl0: -tvl0,
    // tvl1: -tvl1,
  })
  ctx.eventLogger.emit("CraftsmanBalance", {
    lpAmount: -amount,
    user,
    pid,
    pool
    // poolAddress,
    // totalTVL: (tvl0.plus(tvl1)),
    // tvl0: tvl0,
    // tvl1: tvl1,
  })
} catch(e) {
  console.log(e)
}
}

async function xvvsBalanceHandler(_: any, ctx: ERC20Context) {
  const xVVS = "0x7fe4db9063b7dd7ba55313b9c258070bed2c143a"
  const balance = (await ctx.contract.balanceOf(xVVS)).scaleDown(18)
  ctx.meter.Gauge("xVVS").record(balance, {coin_symbol: "VVS"})
}

// async function pairCreated(evt: PairCreatedEvent, ctx: VVSFactoryContext) {
//   const address = evt.args.pair

//   ctx.meter.Counter("pairCreated").add(1)

//   ctx.eventLogger.emit("PairCreated",  {
//     message: address
//   })

//   console.log("binding " + address)
//   poolTemplate.bind({ address: address, startBlock: evt.blockNumber}, ctx)
  
// }
for (var i = 0; i < CORE_POOLS.length; i++) {
  const pool = CORE_POOLS[i]
  VVSPairProcessor.bind({address: pool, network: EthChainId.CRONOS
    , startBlock: 9000000
  })
  .onEventSwap(onSwap)
  .onBlockInterval(blockHandler, 4000, 40000)
  .onTimeInterval(priceSlippageHandler, 6*60, 6*60*10)	
}

CraftsmanProcessor.bind({address: "0xdccd6455ae04b03d785f12196b492b18129564bc", network: EthChainId.CRONOS

})
.onBlockInterval(craftsmanHandler, 4000, 40000)
.onEventDeposit(onCraftsmanDeposit)
.onEventWithdraw(onCraftsmanWithdraw)

ERC20Processor.bind({address: "0x2d03bece6747adc00e1a131bba1469c15fd11e03", network: EthChainId.CRONOS})
.onBlockInterval(xvvsBalanceHandler, 4000, 40000)

// VVSFactoryProcessor.bind({address: "0x3b44b2a187a7b3824131f8db5a74194d0a42fc15", network: EthChainId.CRONOS})
// .onEventPairCreated(pairCreated)

// VVSPairProcessor.bind({ address: "0xfd0Cd0C651569D1e2e3c768AC0FFDAB3C8F4844f", network: EthChainId.CRONOS})
// .onEventSwap(onSwap)
// .onBlockInterval(blockHandler)