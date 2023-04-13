import { CHAIN_IDS, Counter, Gauge } from '@sentio/sdk'
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { getPriceByType, getPriceBySymbol, token } from "@sentio/sdk/utils"
import { OKCSwapFactoryProcessor } from './types/eth/okcswapfactory.js'
import { OKCSwapPairProcessorTemplate, OKCSwapPairProcessor, OKCSwapPairContext, SwapEvent, MintEvent, BurnEvent } from './types/eth/okcswappair.js'

export const OKCSWAP_FACTORY = "0x7b9F0a56cA7D20A44f603C03C6f45Db95b31e539"
export const PAIR_WATCHING = [
  "0x708979068f3a9780f7ce1cb4cda0d30172185092",
  "0x39bd57b490af6cd5333490e4d8cc949ab3187cde",
  "0x7ce7273e560d6c18c098cce7656726db9c1c5ce1",
  "0x42d0064842e0a3f9613c6b03dde5bd7d581bcef5",
  "0x025d94d3e69951931b716219dde93bd7f35503fa",
  "0xff63b17e85532c1d548f516b2bda72f24f952f08",
  "0xf6bda1da6ab3c3f577e50ba6e9127dfc2727c388",
  "0xa118270433a35b417bcb6529b8a405bef0d05e73",
  "0x698e2966d6f38da1803e21fb04858f17bb1e5d3d"
]

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  }
}

async function getTokenInfo(ctx: OKCSwapPairContext, address: string): Promise<token.TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    try {
      return await token.getERC20TokenInfo(ctx, address)
    } catch (error) {
      console.log(error, address)
      return token.NATIVE_ETH
    }
  } else {
    return token.NATIVE_ETH
  }
}

interface poolInfo {
  token0: token.TokenInfo
  token1: token.TokenInfo
  token0Address: string
  token1Address: string
}

// define a map from string to poolInfo
let poolInfoMap = new Map<string, Promise<poolInfo>>()

async function buildPoolInfo(ctx: OKCSwapPairContext): Promise<poolInfo> {
  let address0 = ""
  let address1 = ""
  try {
    address0 = await ctx.contract.token0()
  } catch (error) {
    console.log(error, address0)
  }
  try {
    address1 = await ctx.contract.token1()
  } catch (error) {
    console.log(error, address1)
  }
  const tokenInfo0 = await getTokenInfo(ctx, address0)
  const tokenInfo1 = await getTokenInfo(ctx, address1)
  return {
    token0: tokenInfo0,
    token1: tokenInfo1,
    token0Address: address0,
    token1Address: address1
  }
}

const getOrCreatePool = async function (ctx: OKCSwapPairContext): Promise<poolInfo> {
  let infoPromise = poolInfoMap.get(ctx.address)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx)
    poolInfoMap.set(ctx.address, infoPromise)
    const info = await infoPromise
    const symbol0 = info.token0.symbol
    const symbol1 = info.token1.symbol
    const address0 = info.token0Address
    const address1 = info.token1Address
    console.log("set poolInfoMap for " + ctx.address + " " + symbol0 + " " + address0 + " " + symbol1 + " " + address1)
  }
  return await infoPromise
}


//define the counter and gauge with volOptions
const swap_gauge = Gauge.register("swap", volOptions)
const tradingVolume_gauge = Gauge.register('tradingVolume', volOptions)

const SwapEventHandler = async (event: SwapEvent, ctx: OKCSwapPairContext) => {
  const info = await getOrCreatePool(ctx)

  const address0 = info.token0Address
  const address1 = info.token1Address
  // console.log(address0, address1)

  const symbol0 = info.token0.symbol
  const symbol1 = info.token1.symbol
  const decimal0 = info.token0.decimal
  const decimal1 = info.token1.decimal
  const pairName = symbol0 + "-" + symbol1

  const amount0Out = Number(event.args.amount0Out) / Math.pow(10, decimal0)
  const amount0In = Number(event.args.amount0In) / Math.pow(10, decimal0)
  const amount1Out = Number(event.args.amount1Out) / Math.pow(10, decimal1)
  const amount1In = Number(event.args.amount1In) / Math.pow(10, decimal1)

  const ABS_Amount0 = (amount0In > amount0Out) ? (amount0In - amount0Out) : (amount0Out - amount0In)

  // console.log("Token0:", symbol0, "amount0Out:", amount0Out, " amount0In:", amount0In, "Token1:", symbol1, "amount1Out:", amount1Out, "amount1In:", amount1In)

  //counter swap & gauge
  ctx.meter.Counter('swap_counter').add(1, { pairName: pairName })
  swap_gauge.record(ctx, 1, { pairName: pairName })


  //Gauge reserve
  try {
    const getReserve = await ctx.contract.getReserves()
    const reserve0 = Number(getReserve[0]) / Math.pow(10, decimal0)
    const reserve1 = Number(getReserve[1]) / Math.pow(10, decimal1)
    const blockTimestampLast = getReserve[2]
    // console.log("reserve0:", reserve0, " reserve1:", reserve1, "blockTimestampLast:", blockTimestampLast, "blockTimestampNow:", ctx.timestamp)
    ctx.meter.Gauge('reserve0').record(reserve0, {pairName: pairName})
    ctx.meter.Gauge('reserve1').record(reserve1, {pairName: pairName})
  } catch (error) {
    console.log("failed to get reserved at ",error, ctx.blockNumber)
  }


  //trading volume
  // try {
  //   const token0Price = (await getPriceBySymbol(symbol0, ctx.timestamp, { toleranceInDays: 365 }))!
  //   const token1Price = (await getPriceBySymbol(symbol1, ctx.timestamp, { toleranceInDays: 365 }))!
  //   if (token0Price == null) {
  //     console.log("null token0 price" + symbol0)
  //   }
  //   else if (token1Price == null) {
  //     console.log("null token1 price" + symbol1)
  //   }
  //   else {
  //     const volume0 = ABS_Amount0 * token0Price
  //     // console.log("token0 " + symbol0 + " Price:", token0Price, "Swap amount0", ABS_Amount0, " volume:", volume0)
  //     // console.log("token1 " + symbol1 + " Price:", token1Price)

  //     //gauge reserve usd value
  //     const liquidity0 = reserve0 * token0Price
  //     const liquidity1 = reserve1 * token1Price
  //     ctx.meter.Gauge('reserve0_USD').record(liquidity0, { pairName: pairName })
  //     ctx.meter.Gauge('reserve1_USD').record(liquidity1, { pairName: pairName })
  //     ctx.meter.Gauge('total_liquitity_USD').record(liquidity0 + liquidity1, { pairName: pairName })


  //     //eventLogger
  //     ctx.eventLogger.emit("swap", {
  //       distinctId: event.args.sender,
  //       token0: symbol0,
  //       token1: symbol1,
  //       amount0In: amount0In,
  //       amount1In: amount1In,
  //       amount0Out: amount0Out,
  //       amount1Out: amount1Out,
  //       ABS_Amount0: ABS_Amount0,
  //       tradingVolume: volume0,
  //       pairName: pairName,
  //       message: `${ pairName }, ${ symbol0 } AmountIn: ${ amount0In }, AmountOut: ${ amount0Out }; ${ symbol1 } AmountIn: ${ amount1In }, AmountOut: ${ amount1Out }; Trading Volume: ${ volume0 } `
  //     })
  //     //counter n gauge
  //     tradingVolume_gauge.record(ctx, volume0, { pairName: pairName })
  //     ctx.meter.Counter('tradingVolume_counter').add(volume0, { pairName: pairName })
  //   }
  // }
  // catch (e) {
  //   if (e instanceof Error) {
  //     console.log(e.message)
  //     console.log("catch get price error " + symbol0 + " " + symbol1)
  //   }
  // }
}

const MintEventHandler = async (event: MintEvent, ctx: OKCSwapPairContext) => {
  const info = await getOrCreatePool(ctx)

  const address0 = info.token0Address
  const address1 = info.token1Address

  const symbol0 = info.token0.symbol
  const symbol1 = info.token1.symbol
  const decimal0 = info.token0.decimal
  const decimal1 = info.token1.decimal
  const pairName = symbol0 + "-" + symbol1

  const amount0 = Number(event.args.amount0) / Math.pow(10, decimal0)
  const amount1 = Number(event.args.amount1) / Math.pow(10, decimal1)

  console.log(`${pairName} Mint ${amount0} ${symbol0}, ${amount1} ${symbol1} `)

  ctx.meter.Counter("total_mint").add(amount0, {
    symbol: symbol0, pair: pairName
  })
  ctx.meter.Counter("total_mint").add(amount1, {
    symbol: symbol1, pair: pairName
  })

  ctx.eventLogger.emit("Mint", {
    distinctId: event.args.sender,
    amount0: amount0,
    symbol0: symbol0,
    amount1: amount1,
    symbol1: symbol1,
    pairName: pairName,
    message: `${pairName} Mint ${amount0} ${symbol0}, ${amount1} ${symbol1} `
  })

  //counter
  ctx.meter.Counter('mint').add(1, { pair: pairName })

}


const BurnEventHandler = async (event: BurnEvent, ctx: OKCSwapPairContext) => {
  const info = await getOrCreatePool(ctx)

  const address0 = info.token0Address
  const address1 = info.token1Address

  const symbol0 = info.token0.symbol
  const symbol1 = info.token1.symbol
  const decimal0 = info.token0.decimal
  const decimal1 = info.token1.decimal
  const pairName = symbol0 + "-" + symbol1

  const amount0 = Number(event.args.amount0) / Math.pow(10, decimal0)
  const amount1 = Number(event.args.amount1) / Math.pow(10, decimal1)

  console.log(`${pairName} Burn ${amount0} ${symbol0}, ${amount1} ${symbol1} `)

  ctx.meter.Counter("total_burn").add(amount0, {
    symbol: symbol0, pair: pairName
  })
  ctx.meter.Counter("total_burn").add(amount1, {
    symbol: symbol1, pair: pairName
  })
  ctx.eventLogger.emit("Burn", {
    distinctId: event.args.sender,
    amount0: amount0,
    symbol0: symbol0,
    amount1: amount1,
    symbol1: symbol1,
    pairName: pairName,
    message: `${pairName} Burn ${amount0} ${symbol0}, ${amount1} ${symbol1} `
  })
  //counter
  ctx.meter.Counter('burn').add(1, { pairName: pairName })

}


for (let i = 0; i < PAIR_WATCHING.length; i++) {
  let address = PAIR_WATCHING[i]
  OKCSwapPairProcessor.bind({ address: address, network: CHAIN_IDS.OKEXCHAIN })
    .onEventSwap(SwapEventHandler)
    .onEventMint(MintEventHandler)
    .onEventBurn(BurnEventHandler)
}



// OKCSwapFactoryProcessor.bind({ address: OKCSWAP_FACTORY, network: CHAIN_IDS.OKEXCHAIN })
//   .onEventPairCreated(async (event, ctx) => {
//     ctx.meter.Counter("pairCreated_counter").add(1)
//     const pair = event.args.pair
//     //console.log(pair)
//     // pairTemplate.bind({ address: pair, network: CHAIN_IDS.OKEXCHAIN })
//   })



// const pairTemplate = new OKCSwapPairProcessorTemplate()
//   .onEventSwap(SwapEventHandler)
//   .onEventMint(MintEventHandler)
//   .onEventBurn(BurnEventHandler)