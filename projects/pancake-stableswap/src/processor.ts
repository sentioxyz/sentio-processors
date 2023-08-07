import { FactoryProcessor, FactoryContext, NewStableSwapPairEvent } from "./types/eth/factory.js"
import { PoolProcessorTemplate, TokenExchangeEvent, PoolContext } from "./types/eth/pool.js"
import { EthChainId } from "@sentio/sdk/eth";
import * as constant from './constant.js'
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20"

const TokenExchangeHandler = async (event: TokenExchangeEvent, ctx: PoolContext) => {
  if (!constant.PoolInfoMap[ctx.address]) {
    console.log(`contract not in pool ${ctx.address}`)
    return
  }

  ctx.meter.Counter("token_exchange_counter").add(1)

  const buyer = event.args.buyer
  const sold_id = Number(event.args.sold_id)
  const bought_id = Number(event.args.bought_id)
  const soldToken = sold_id == 0 ? constant.PoolInfoMap[ctx.address].token0 : constant.PoolInfoMap[ctx.address].token1
  const boughtToken = bought_id == 0 ? constant.PoolInfoMap[ctx.address].token0 : constant.PoolInfoMap[ctx.address].token1
  const soldDecimal = constant.CoinInfoMap[soldToken].decimal
  const soldSymbol = constant.CoinInfoMap[soldToken].symbol
  const tokens_sold = Number(event.args.tokens_sold) / Math.pow(10, soldDecimal)
  const boughtDecimal = constant.CoinInfoMap[boughtToken].decimal
  const boughtSymbol = constant.CoinInfoMap[boughtToken].symbol
  const tokens_bought = Number(event.args.tokens_bought) / Math.pow(10, boughtDecimal)

  ctx.eventLogger.emit("Swap", {
    distinctId: buyer,
    soldSymbol,
    tokens_sold,
    boughtSymbol,
    tokens_bought,
    message: `Swap ${tokens_sold} ${soldSymbol} to ${tokens_bought} ${boughtSymbol}`
  })

  ctx.meter.Counter("swap_counter").add(tokens_sold, { coin_symbol: soldSymbol })
}

FactoryProcessor.bind({
  network: EthChainId.BINANCE,
  address: "0x36bBb126e75351C0DfB651e39b38fe0BC436FFD2"
})
  .onEventNewStableSwapPair(async (event: NewStableSwapPairEvent, ctx: FactoryContext) => {
    const swapContract = event.args.swapContract
    const tokenA = event.args.tokenA
    const tokenB = event.args.tokenB

    ctx.eventLogger.emit("NewStableSwapPair", {
      swapContract,
      tokenA,
      tokenB
    })

    poolTemplate.bind(
      {
        address: swapContract,
        startBlock: ctx.blockNumber
      },
      ctx
    )
  })



const poolTemplate = new PoolProcessorTemplate()
  .onEventAddLiquidity(async (event, ctx) => {
    // ctx.meter.Counter("add_liquidity_counter").add(1)
    ctx.eventLogger.emit("AddLiquidity", { distinctId: event.args.provider })
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    // ctx.meter.Counter("remove_liquidity_counter").add(1)
    ctx.eventLogger.emit("RemoveLiquidity", { distinctId: event.args.provider })
  })
  .onEventTokenExchange(TokenExchangeHandler)
  .onTimeInterval(async (_, ctx) => {
    // ctx.meter.Counter("on_time_interval_counter").add(1)
    const token0_amount = Number(await getERC20Contract(ctx.chainId, constant.PoolInfoMap[ctx.address].token0).balanceOf(ctx.address)) / Math.pow(10, constant.CoinInfoMap[constant.PoolInfoMap[ctx.address].token0].decimal)
    const token1_amount = Number(await getERC20Contract(ctx.chainId, constant.PoolInfoMap[ctx.address].token1).balanceOf(ctx.address)) / Math.pow(10, constant.CoinInfoMap[constant.PoolInfoMap[ctx.address].token1].decimal)
    ctx.meter.Gauge("tvl").record(token0_amount + token1_amount, { pool: ctx.address })
  }, 1440, 1440)


