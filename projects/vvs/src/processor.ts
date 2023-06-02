import { VVSPairContext, VVSPairProcessor, SwapEvent, VVSPairProcessorTemplate } from "./types/eth/vvspair.js";
import { EthChainId, BigDecimal, Gauge } from "@sentio/sdk"
import { getPriceByType,  token } from "@sentio/sdk/utils"
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { VVSFactoryProcessor, VVSFactoryContext, PairCreatedEvent } from "./types/eth/vvsfactory.js";

interface poolInfo {
  token0: token.TokenInfo
  token1: token.TokenInfo
  token0Address: string
  token1Address: string
  poolName: string
  // fee: string
}

let poolInfoMap = new Map<string, Promise<poolInfo>>()

const poolTemplate = new VVSPairProcessorTemplate()
.onEventSwap(onSwap)
.onBlockInterval(blockHandler)


export const gaugeOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

export const vol = Gauge.register("vol", gaugeOptions)
export const fee = Gauge.register("fee", gaugeOptions)
const fee_rate = 0.0003



async function buildPoolInfo(token0Promise: Promise<string>,
  token1Promise: Promise<string>): Promise<poolInfo> {
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

async function getUsdValue(ctx: VVSPairContext, info: token.TokenInfo, token :string, amount: BigDecimal): Promise<BigDecimal> {
  const price = await getPriceByType(EthChainId.CRONOS, token, ctx.timestamp) || 0
  return amount.multipliedBy(price)
}

function maxBigInt(a: BigInt, b: BigInt): BigInt {
  return a > b ? a : b;
}

async function onSwap(evt: SwapEvent, ctx: VVSPairContext) {
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
  })

  fee.record(ctx, usd0.multipliedBy(fee_rate), {
    poolName: poolInfo.poolName,
    token0: poolInfo.token0.symbol,
    token1: poolInfo.token1.symbol,
    token_symbol: poolInfo.token0.symbol,
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
    priceDiff: priceDiff
  })
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
} catch (e) {
  console.log(e)
}
}

async function pairCreated(evt: PairCreatedEvent, ctx: VVSFactoryContext) {
  const address = evt.args.pair

  ctx.meter.Counter("pairCreated").add(1)

  ctx.eventLogger.emit("PairCreated",  {
    message: address
  })

  console.log("binding " + address)
  poolTemplate.bind({ address: address, startBlock: evt.blockNumber}, ctx)
  
}

VVSFactoryProcessor.bind({address: "0x3b44b2a187a7b3824131f8db5a74194d0a42fc15", network: EthChainId.CRONOS})
.onEventPairCreated(pairCreated)

// VVSPairProcessor.bind({ address: "0xfd0Cd0C651569D1e2e3c768AC0FFDAB3C8F4844f", network: EthChainId.CRONOS})
// .onEventSwap(onSwap)
// .onBlockInterval(blockHandler)