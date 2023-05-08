import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { token, getPriceByType } from "@sentio/sdk/utils"
import { RouterProcessor } from './types/eth/router.js'
import { FactoryProcessor } from './types/eth/factory.js'
import { MarketProcessorTemplate } from './types/eth/market.js'
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import * as constant from "./constant.js"


RouterProcessor.bind({ address: constant.ETH_ROUTER })
  .onEventAddLiquiditySingleToken(async (event, ctx) => {
    //get event args
    const caller = event.args.caller
    const market = event.args.market.toLowerCase()
    const token_address = event.args.token
    const netTokenIn = event.args.netTokenIn
    const netLpOut = event.args.netLpOut

    //eventlogger for analytics
    ctx.eventLogger.emit("add_liquidity_single_token", {
      distinctId: caller,
      market,
      token_address,
      netTokenIn,
      netLpOut
    })
  })
  .onEventAddLiquiditySinglePt(async (event, ctx) => {
    const caller = event.args.caller
    const market = event.args.market.toLowerCase()
    const receiver = event.args.receiver
    const netPtIn = Number(event.args.netPtIn.scaleDown(18))
    const netLpOut = Number(event.args.netLpOut.scaleDown(18))

    ctx.meter.Counter("PT").add(netPtIn, { market })
    ctx.meter.Counter("LP_Out").add(netLpOut, { market })

    ctx.eventLogger.emit("add_liquidity_single_PT", {
      distinctId: caller,
      market,
      receiver,
      netPtIn,
      netLpOut
    })
  })
  .onEventAddLiquiditySingleSy(async (event, ctx) => {
    const caller = event.args.caller
    const market = event.args.market.toLowerCase()
    const receiver = event.args.receiver
    const netSyIn = Number(event.args.netSyIn.scaleDown(18))
    const netLpOut = Number(event.args.netLpOut.scaleDown(18))

    ctx.meter.Counter("SY").add(netSyIn, { market })
    ctx.meter.Counter("LP_Out").add(netLpOut, { market })

    ctx.eventLogger.emit("add_liquidity_single_SY", {
      distinctId: caller,
      market,
      receiver,
      netSyIn,
      netLpOut
    })
  })
  .onEventAddLiquiditySingleTokenKeepYt(async (event, ctx) => {
    //TODO: write processor code for this event
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
  //onEventXXX: handle other events to track
  .onAllEvents(async (event, ctx) => {
    let from
    try {
      let tx = (await ctx.contract.provider.getTransaction(event.transactionHash))!
      from = tx.from
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message)
      }
    }
    ctx.eventLogger.emit("Any_Event", {
      distinctId: from,
      eventName: event.name
    })
  })


FactoryProcessor.bind({ address: constant.ETH_MARKET_FACTORY })
  .onEventCreateNewMarket(async (event, ctx) => {
    ctx.meter.Counter('pool_num').add(1)
    marketTemplate.bind({ address: event.args.market, startBlock: ctx.blockNumber }, ctx)
  })


const marketTemplate = new MarketProcessorTemplate()
  .onEventBurn(async (event, ctx) => {
    const hash = ctx.transactionHash
    const [SY_address, PT_address, YT_address] = await ctx.contract.readTokens()
    const SY_balance = Number((await getERC20Contract(ctx.chainId, SY_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const PT_balance = Number((await getERC20Contract(ctx.chainId, PT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const YT_balance = Number((await getERC20Contract(ctx.chainId, YT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    console.log(`token_addresses ${SY_address}, ${PT_address}, ${YT_address}, SY_balance ${SY_balance}, PT_balance${PT_balance}, YT_balance ${YT_balance}, contract address ${ctx.address}`)

    const market = getMarketName(constant.ETH_MARKET_MAP, ctx.address)
    ctx.meter.Gauge("SY").record(SY_balance, { market })
    ctx.meter.Gauge("PT").record(PT_balance, { market })
    ctx.meter.Gauge("YT").record(YT_balance, { market })
    console.log(`burn event, tx: ${hash}, SY_balance ${SY_balance}, PT_balance${PT_balance},YT_balance ${YT_balance}, market ${market}`)

  })
  .onEventMint(async (event, ctx) => {
    const hash = ctx.transactionHash
    const [SY_address, PT_address, YT_address] = await ctx.contract.readTokens()
    const SY_balance = Number((await getERC20Contract(ctx.chainId, SY_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const PT_balance = Number((await getERC20Contract(ctx.chainId, PT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const YT_balance = Number((await getERC20Contract(ctx.chainId, YT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    console.log(`token_addresses ${SY_address}, ${PT_address}, ${YT_address}, SY_balance ${SY_balance}, PT_balance${PT_balance}, YT_balance ${YT_balance}, contract address ${ctx.address}`)

    const market = getMarketName(constant.ETH_MARKET_MAP, ctx.address)
    ctx.meter.Gauge("SY").record(SY_balance, { market })
    ctx.meter.Gauge("PT").record(PT_balance, { market })
    ctx.meter.Gauge("YT").record(YT_balance, { market })
    console.log(`mint event, tx: ${hash}, SY_balance ${SY_balance}, PT_balance${PT_balance}, YT_balance ${YT_balance}, market ${market}`)
  })
  .onEventSwap(async (event, ctx) => {
    const hash = ctx.transactionHash
    const [SY_address, PT_address, YT_address] = await ctx.contract.readTokens()
    const SY_balance = Number((await getERC20Contract(ctx.chainId, SY_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const PT_balance = Number((await getERC20Contract(ctx.chainId, PT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    const YT_balance = Number((await getERC20Contract(ctx.chainId, YT_address.toLowerCase()).balanceOf(ctx.address, { blockTag: Number(ctx.blockNumber) })).scaleDown(18))
    console.log(`token_addresses ${SY_address}, ${PT_address}, ${YT_address}, SY_balance ${SY_balance}, PT_balance${PT_balance}, YT_balance ${YT_balance}, contract address ${ctx.address}`)

    const market = getMarketName(constant.ETH_MARKET_MAP, ctx.address)
    ctx.meter.Gauge("SY").record(SY_balance, { market })
    ctx.meter.Gauge("PT").record(PT_balance, { market })
    ctx.meter.Gauge("YT").record(YT_balance, { market })
    console.log(`swap event, tx: ${hash}, SY_balance ${SY_balance}, PT_balance${PT_balance}, YT_balance ${YT_balance}, market ${market}`)

  })

function getMarketName(map: Map<string, string>, address: string) {
  let name = "can't find market name"
  map.forEach((value: string, key: string) => {
    if (value == address.toLowerCase()) {
      name = key
    }
  });
  return name

}


