import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { token, getPriceByType } from "@sentio/sdk/utils"
import { RouterProcessor } from './types/eth/router.js'
import { FactoryProcessor } from './types/eth/factory.js'
import { MarketProcessorTemplate } from './types/eth/market.js'
import * as constant from "./constant.js"

RouterProcessor.bind({ address: constant.ROUTER })
  .onEventAddLiquiditySingleToken(async (event, ctx) => {
    //get event args
    const caller = event.args.caller
    const market = event.args.market
    const token_address = event.args.token
    const netTokenIn = event.args.netTokenIn
    const netLpOut = event.args.netLpOut

    //get ERC20 token info
    // const tokenInfo = await token.getERC20TokenInfo(token_address, 1)
    // const amount = Number(netTokenIn.scaleDown(tokenInfo.decimal))
    // const symbol = tokenInfo.symbol
    // // const price = (await getPriceByType("1", token_address, ctx.timestamp))
    // // if (!price) {
    // //   console.warn(`no price found for ${symbol}`)
    // //   return
    // // }
    // const volume = amount * price
    // console.log(`price of ${symbol} at ${ctx.timestamp} = ${price}. tx volume = ${volume}`)

    //counter and gauge volume for monitoring
    // ctx.meter.Gauge("vol").record(volume, { symbol: symbol })
    // ctx.meter.Counter("reserve").add(amount, { symbol: symbol })

    //eventlogger for analytics
    ctx.eventLogger.emit("add_liquidity_single_token", {
      distinctId: caller,
      // symbol,
      // amount,
      // volume,
      market,
      token_address,
      netTokenIn,
      netLpOut
    })
  })
  .onEventAddLiquidityDualTokenAndPt(async (event, ctx) => {
    //TODO: write processor code for this event
  })
  .onEventRemoveLiquiditySingleToken(async (event, ctx) => {
    //TODO: write processor code for this event
  })
  .onEventRemoveLiquidityDualTokenAndPt(async (event, ctx) => {
    //TODO: write processor code for this event
  })
  .onAllEvents(async (event, ctx) => {

    ctx.eventLogger.emit(event.name, {
    })
  })


FactoryProcessor.bind({ address: constant.MARKET_FACTORY })
  .onEventCreateNewMarket(async (event, ctx) => {
    ctx.meter.Counter('pool_num').add(1)
    marketTemplate.bind({ address: event.args.market, startBlock: ctx.blockNumber })
  })

const marketTemplate = new MarketProcessorTemplate()
  .onEventBurn(async (event, ctx) => {
    const hash = ctx.transactionHash
    console.log(`burn event, tx: ${hash}`)
  })
  .onEventMint(async (event, ctx) => {
    const hash = ctx.transactionHash
    console.log(`mint event, tx: ${hash}`)
  })
  .onEventSwap(async (event, ctx) => {
    const hash = ctx.transactionHash
    console.log(`swap event, tx: ${hash}`)
    // ctx.meter.Gauge("swap_amount0").record(
    //   Math.abs(Number(event.args.amount0.toBigInt())),
    //   {
    //     from: await ctx.contract.token0(),
    //     to: await ctx.contract.token1()
    //   }
    // )
  })


  // for(var key in dict) {
  //   var value = dict[key];
  
  //   // do something with "key" and "value" variables
  // }
  // Copy
  