import { PancakeRouterProcessor } from './types/eth/pancakerouter.js'
import { PancakePairProcessor, PancakePairContext } from './types/eth/pancakepair.js'

import { getPriceByType, getPriceBySymbol, token } from "@sentio/sdk/utils"
import { CHAIN_IDS, Gauge, Counter } from "@sentio/sdk"
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { MasterChefProcessor } from './types/eth/masterchef.js'

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
  "0x048f02d143638a40c0b0e425daaf276df2e64e96",
  "0xbb1290c1829007f440c771b37718fabf309cd527",
  "0x806f746a7c4293092ac7aa604347be123322df1e",
  "0x87988ebde7e661f44eb3a586c5e0ceab533a2d9c",
  "0x40e938688a121370092a06745704c112c5ee5791",
  "0xddea1b3343c438c2e2d636d070cfb4f63d26636e",
  "0x61a49ba86e168cd25ca795b07b0a93236bb25127",
  "0xf041a8e6e27341f5f865a22f01fa37e065c32156",
  "0x3d78a6cca5c717c0e8702896892f3522d0b07010",
  "0xccefddff4808f3e1e0340e19e43f1e9fd088b3f2",
  "0xf4119c3d9e65602bb34f2455644e45c98d29bb4b",
  "0xbd13fd873d36f7d2a349b35e6854e3183ede18ab",
  "0xeee106aa8a0de519e8eb21c66a5c2275b46b3f4d",
  "0x78d5c2adeb11be00033cc4edb2c2889cf945415e",
  "0x74d9ba3eeed8ea15fbf883ed86895b388dc1d36f",
  "0x7843ecd6f3234d72d0b7034dd9894b77c416c6ef",
  "0x92127ec0ebef8b30378d757bbe8dce18210b848b",
  "0xd72a602c714ae36d990dc835ea5f96ef87657d5e",
  "0xdc0b29cb77c225a2a7767f20d49721858fa9822f",
  "0x8897d79334c2d517b83e7846da4b922e68fda61b",
  "0xca59df939290421047876c917789afdb68d5d6f1",
  "0x4f38eaa2ee8b1344e268496e02bbbaf9d1b34f0a"
]

const ROUTER_ADDRESS = "0xE915D2393a08a00c5A463053edD31bAe2199b9e7"
const FACTORY_ADDRESS = "0xA9473608514457b4bF083f9045fA63ae5810A03E"

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  }
}

async function getTokenInfo(ctx: PancakePairContext, address: string): Promise<token.TokenInfo> {
  // TODO(ye): this is wrong in the first place. this is a special address for native eth. does not apply here.
  if (address !== "0x0000000000000000000000000000000000000000") {
    // This is a hack.
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

async function buildPoolInfo(ctx: PancakePairContext, token0Promise: Promise<string>,
  token1Promise: Promise<string>): Promise<poolInfo> {
  let address0 = ""
  let address1 = ""
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
  const tokenInfo0 = await getTokenInfo(ctx, address0)
  const tokenInfo1 = await getTokenInfo(ctx, address1)
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
    infoPromise = buildPoolInfo(ctx, ctx.contract.token0(), ctx.contract.token1())
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


//first pair created at 1647497
for (let i = 0; i < PairWatching.length; i++) {
  let address = PairWatching[i]
  PancakePairProcessor.bind({ address: address, network: CHAIN_IDS.ASTAR, startBlock: 2700000 })
    .onEventSwap(async (event, ctx) => {
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
      const getReserve = await ctx.contract.getReserves()
      const reserve0 = Number(getReserve[0]) / Math.pow(10, decimal0)
      const reserve1 = Number(getReserve[1]) / Math.pow(10, decimal1)
      const blockTimestampLast = getReserve[2]
      // console.log("reserve0:", reserve0, " reserve1:", reserve1, "blockTimestampLast:", blockTimestampLast, "blockTimestampNow:", ctx.timestamp)
      ctx.meter.Gauge('reserve0').record(reserve0, { pairName: pairName })
      ctx.meter.Gauge('reserve1').record(reserve1, { pairName: pairName })


      //trading volume
      try {
        const token0Price = (await getPriceBySymbol(symbol0, ctx.timestamp, { toleranceInDays: 365 }))!
        const token1Price = (await getPriceBySymbol(symbol1, ctx.timestamp, { toleranceInDays: 365 }))!
        if (token0Price == null) {
          console.log("null token0 price" + symbol0)
        }
        else if (token1Price == null) {
          console.log("null token1 price" + symbol1)
        }
        else {
          const volume0 = ABS_Amount0 * token0Price
          // console.log("token0 " + symbol0 + " Price:", token0Price, "Swap amount0", ABS_Amount0, " volume:", volume0)
          // console.log("token1 " + symbol1 + " Price:", token1Price)

          //gauge reserve usd value
          const liquidity0 = reserve0 * token0Price
          const liquidity1 = reserve1 * token1Price
          ctx.meter.Gauge('reserve0_USD').record(liquidity0, { pairName: pairName })
          ctx.meter.Gauge('reserve1_USD').record(liquidity1, { pairName: pairName })
          ctx.meter.Gauge('total_liquitity_USD').record(liquidity0 + liquidity1, { pairName: pairName })


          //eventLogger
          ctx.eventLogger.emit("swap", {
            distinctId: event.args.sender,
            token0: symbol0,
            token1: symbol1,
            amount0In: amount0In,
            amount1In: amount1In,
            amount0Out: amount0Out,
            amount1Out: amount1Out,
            ABS_Amount0: ABS_Amount0,
            tradingVolume: volume0,
            pairName: pairName,
            message: `${pairName}, ${symbol0} AmountIn: ${amount0In}, AmountOut: ${amount0Out}; ${symbol1} AmountIn: ${amount1In}, AmountOut: ${amount1Out}; Trading Volume: ${volume0}`
          })
          //counter n gauge
          tradingVolume_gauge.record(ctx, volume0, { pairName: pairName })
          ctx.meter.Counter('tradingVolume_counter').add(volume0, { pairName: pairName })
        }
      }
      catch (e) {
        if (e instanceof Error) {
          console.log(e.message)
          console.log("catch get price error " + symbol0 + " " + symbol1)
        }
      }
    })
    .onEventMint(async (event, ctx) => {

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

      console.log(`${pairName} Mint ${amount0} ${symbol0}, ${amount1} ${symbol1}`)

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
        message: `${pairName} Mint ${amount0} ${symbol0}, ${amount1} ${symbol1}`
      })

      //counter
      ctx.meter.Counter('mint').add(1, { pair: pairName })

    })
    .onEventBurn(async (event, ctx) => {
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

      console.log(`${pairName} Burn ${amount0} ${symbol0}, ${amount1} ${symbol1}`)

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
        message: `${pairName} Burn ${amount0} ${symbol0}, ${amount1} ${symbol1}`
      })
      //counter
      ctx.meter.Counter('burn').add(1, { pairName: pairName })

    })
    .onAllEvents(async (event, ctx) => { })

}



MasterChefProcessor.bind({ address: '0xc5b016c5597D298Fe9eD22922CE290A048aA5B75', network: CHAIN_IDS.ASTAR })
  .onEventDeposit(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    const to = event.args.to
    ctx.eventLogger.emit("Deposit", {
      distinctId: user,
      pid,
      amount,
      to
    }
    )
  })
  .onEventWithdraw(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    ctx.eventLogger.emit("Withdraw", {
      distinctId: user,
      pid,
      amount
    }
    )
  })
  .onEventHarvest(async (event, ctx) => {
    const user = event.args.user
    const pid = Number(event.args.pid)
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    ctx.eventLogger.emit("Harvest", {
      distinctId: user,
      pid,
      amount
    }
    )
  })