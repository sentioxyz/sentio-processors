import { PancakeRouterProcessor } from './types/eth/pancakerouter.js'
import { PancakePairProcessor, PancakePairContext } from './types/eth/pancakepair.js'

import { getPriceByType, getPriceBySymbol, token } from "@sentio/sdk/utils"
import { CHAIN_IDS } from "@sentio/sdk"
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'


const PairWatching = [
  "0x4a2e82964f3a4af50fc332497803f77a87647e6d",
  "0xc8b6ccf2520e402d3ef1e6040620323650892718",
  "0x8ebeb1b508b9632f14bfb074a7ef0db9488d28d3",
  "0xbce013493f43f6bb29bd06667e6632b1acf23529",
  "0x848162f2fae144d1baf057406940ee88071bb7d2",
  "0xb4461721d3ad256cd59d207fefbfe05791ef8568",
  "0x900e71a3745cb660aae9e351ff665c081f1a1ea4",
  "0x4d0c348742d5f60baacfebffd2d80a3adfa3f0fe",
  "0x3ffcb129cf2392685d49f7c7b336359528c0958a",
  "0x2cd341f19387d15e8fcd6c9d10ac08353ab2e2f3",
  "0x3f61a095cc21f99e0bf82966579595f2fc0d4d59",
  "0x8dd2f750f7f383ecc3cc2383b1386d425e64dee6",
  "0x9c728cb130ed60eebaf84e6b260d369fa6415f5e",
  "0x1b961985c891b34ba729d969122252e5abc30be6",
  "0xf13bb09d987f5b01f67246d8f3a929930f4b73ca",
  "0x4df7e885b949688fa388a10426abd8f6208fc64c",
  "0x49d1db92a8a1511a6eeb867221d801bc974a3073",
  "0x73eea1180c2d1772ea2118fda888a81943bac3c8",
  "0x50497e7181eb9e8ccd70a9c44fb997742149482a",
  "0xddda37daddffda55a0f4b1bde1ea5b5ba8cb0903",
  "0x048f02d143638a40c0b0e425daaf276df2e64e96"
]

const ROUTER_ADDRESS = "0xE915D2393a08a00c5A463053edD31bAe2199b9e7"
const FACTORY_ADDRESS = "0xA9473608514457b4bF083f9045fA63ae5810A03E"


async function getTokenInfo(address: string): Promise<token.TokenInfo> {
    // TODO(ye): this is wrong in the first place. this is a special address for native eth. does not apply here.
  if (address !== "0x0000000000000000000000000000000000000000") {
      // This is a hack.
    try {
        return await token.getERC20TokenInfo(address, 592)
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

async function buildPoolInfo(token0Promise: Promise<string>,
  token1Promise: Promise<string>): Promise<poolInfo> {
    let address0 =  ""
    let address1 =  ""
    try {
        address0 = await token0Promise
    } catch (error) {
        console.log(error, address0)
    }
    try {
        address1 = await token1Promise
    } catch (error) {
        console.log(error, address1)
    }
  const tokenInfo0 = await getTokenInfo(address0)
  const tokenInfo1 = await getTokenInfo(address1)
  return {
    token0: tokenInfo0,
    token1: tokenInfo1,
    token0Address: address0,
    token1Address: address1
  }
}

const getOrCreatePool = async function (ctx: PancakePairContext): Promise<poolInfo> {
  let infoPromise = poolInfoMap.get(ctx.address)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx.contract.token0(), ctx.contract.token1())
    poolInfoMap.set(ctx.address, infoPromise)
    console.log("set poolInfoMap for " + ctx.address)
  }
  return await infoPromise
}

for (let i = 0; i < PairWatching.length; i++) {
  let address = PairWatching[i]
  PancakePairProcessor.bind({ address: address, network: CHAIN_IDS.ASTAR, startBlock: 3010709 })
    .onEventSwap(async (event, ctx) => {
      ctx.meter.Counter('swap').add(1)
      // ctx.meter.Gauge("reserve").record(totalSupply, { token: tokenInfo.symbol })

      const info = await getOrCreatePool(ctx)

      const address0 = info.token0Address
      const address1 = info.token1Address
      console.log(address0, address1)

      const symbol0 = info.token0.symbol
      const symbol1 = info.token1.symbol
      const decimal0 = info.token0.decimal
      const decimal1 = info.token1.decimal
      const pairName = symbol0 + "-" + symbol1

      const amount0Out = Number(event.args.amount0Out) / Math.pow(10, decimal0)
      const amount0In = Number(event.args.amount0In) / Math.pow(10, decimal0)
      const amount1Out = Number(event.args.amount1Out) / Math.pow(10, decimal1)
      const amount1In = Number(event.args.amount1In) / Math.pow(10, decimal1)

      console.log("Token0:", symbol0, "amount0Out:", amount0Out, " amount0In:", amount0In, "Token1:", symbol1, "amount1Out:", amount1Out, "amount1In:", amount1In)


      //getReserve
      const getReserve = await ctx.contract.getReserves()
      const reserve0 = Number(getReserve[0]) / Math.pow(10, decimal0)
      const reserve1 = Number(getReserve[1]) / Math.pow(10, decimal1)
      const blockTimestampLast = getReserve[2]
      console.log("reserve0:", reserve0, " reserve1:", reserve1, "blockTimestampLast:", blockTimestampLast, "blockTimestampNow:", ctx.timestamp)
      ctx.meter.Gauge('reserve0').record(reserve0)
      ctx.meter.Gauge('reserve1').record(reserve1)

      // //trading volume
      // const token0Price = await getPriceBySymbol(symbol0, ctx.timestamp)
      // const volume0 = amount0In * token0Price
      // console.log("token0Price:", token0Price, "amount0In", amount0In, " volume:", volume0)
      // ctx.meter.Counter('vol_counter').add(volume0, { symbol: symbol0, pair: pairName })
      // ctx.meter.Gauge('vol_gauge').record(volume0, { symbol: symbol0, pair: pairName })

      // const token1Price = await getPriceBySymbol(symbol1, ctx.timestamp)
      // const volume1 = amount1In * token1Price
      // console.log("token1Price:", token1Price, "amount1In", amount1In, " volume:", volume1)
      // ctx.meter.Counter('vol_counter').add(volume1, { symbol: symbol1, pair: pairName })
      // ctx.meter.Gauge('vol_gauge').record(volume1, { symbol: symbol1, pair: pairName })

    })
    .onEventMint(async (event, ctx) => {
      ctx.meter.Counter('mint').add(1)
      //ctx.meter.Gauge("").record(totalSupply, { token: tokenInfo.symbol })
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

      console.log("MINT--", "amount0:", amount0, " amount1:", amount1)

      ctx.meter.Counter("total_mint").add(amount0, {
        symbol: symbol0, pair: pairName
      })
      ctx.meter.Counter("total_mint").add(amount1, {
        symbol: symbol1, pair: pairName
      })
    })
    .onEventBurn(async (event, ctx) => {
      ctx.meter.Counter('burn').add(1)
      //ctx.meter.Gauge("").record(totalSupply, { token: tokenInfo.symbol })
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

      console.log("BURN--", "amount0:", amount0, " amount1:", amount1)

      ctx.meter.Counter("total_burn").add(amount0, {
        symbol: symbol0, pair: pairName
      })
      ctx.meter.Counter("total_burn").add(amount1, {
        symbol: symbol1, pair: pairName
      })
    })

}

