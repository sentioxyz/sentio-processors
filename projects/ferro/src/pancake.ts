import { PancakeFactoryProcessor, PancakeFactoryContext } from "./types/eth/pancakefactory.js"
import { PancakePoolProcessorTemplate, PancakePoolProcessor, TokenExchangeEvent, PancakePoolContext } from "./types/eth/pancakepool.js"
import { EthChainId } from "@sentio/sdk/eth"
import * as constant from './pancake-constant.js'
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { getPriceBySymbol } from "@sentio/sdk/utils"

const TokenExchangeHandler = async (event: TokenExchangeEvent, ctx: PancakePoolContext) => {
  if (!constant.PoolInfoMap[ctx.address]) {
    console.log(`contract not in pool ${ctx.address}`)
    return
  }

  // ctx.meter.Counter("token_exchange_counter").add(1)

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
  const poolName = constant.PoolInfoMap[ctx.address].poolName

  //TODO: add more price symbol for exact token price
  let volumeApproximate = 0
  if (soldSymbol == "WBNB") {
    const WBNB_price = (await getPriceBySymbol("wbnb", ctx.timestamp))!
    volumeApproximate = WBNB_price * tokens_sold
  } else if (boughtSymbol == "WBNB") {
    const WBNB_price = (await getPriceBySymbol("wbnb", ctx.timestamp))!
    volumeApproximate = WBNB_price * tokens_bought
  } else {
    volumeApproximate = tokens_sold
  }


  ctx.eventLogger.emit("Swap", {
    distinctId: buyer,
    soldSymbol,
    tokens_sold,
    boughtSymbol,
    tokens_bought,
    volumeApproximate,
    poolName,
    project: "pancake",
    message: `Swap ${tokens_sold} ${soldSymbol} to ${tokens_bought} ${boughtSymbol}`
  })

  ctx.meter.Counter("swap_counter").add(tokens_sold, {
    coin_symbol: soldSymbol, poolName, project: "pancake",
  })
}

// PancakeFactoryProcessor.bind({
//   network: EthChainId.BSC,
//   address: "0x36bBb126e75351C0DfB651e39b38fe0BC436FFD2"
// })
//   .onEventNewStableSwapPair(async (event: NewStableSwapPairEvent, ctx: PancakeFactoryContext) => {
//     const swapContract = event.args.swapContract
//     const tokenA = event.args.tokenA
//     const tokenB = event.args.tokenB

//     ctx.eventLogger.emit("NewStableSwapPair", {
//       swapContract,
//       tokenA,
//       tokenB
//     })

//     // poolTemplate.bind(
//     //   {
//     //     address: swapContract,
//     //     startBlock: ctx.blockNumber
//     //   },
//     //   ctx
//     // )
//   })


for (let address in constant.PoolInfoMap) {
  PancakePoolProcessor.bind({
    network: EthChainId.BSC,
    address: address,
    // startBlock: 28343440
  })
    // const poolTemplate = new PancakePoolProcessorTemplate()
    .onEventAddLiquidity(async (event, ctx) => {
      ctx.meter.Counter("add_liquidity_counter").add(1)
      ctx.eventLogger.emit("AddLiquidity", {
        distinctId: event.args.provider, project: "pancake",
      })
    })
    .onEventRemoveLiquidity(async (event, ctx) => {
      ctx.meter.Counter("remove_liquidity_counter").add(1)
      ctx.eventLogger.emit("RemoveLiquidity", {
        distinctId: event.args.provider, project: "pancake",
      })
    })
    .onEventTokenExchange(TokenExchangeHandler)
    .onTimeInterval(async (_, ctx) => {
      // ctx.meter.Counter("on_time_interval_counter").add(1)
      try {
        const token0_amount = Number(await getERC20ContractOnContext(ctx, constant.PoolInfoMap[address].token0).balanceOf(address)) / Math.pow(10, constant.CoinInfoMap[constant.PoolInfoMap[address].token0].decimal)
        const token1_amount = Number(await getERC20ContractOnContext(ctx, constant.PoolInfoMap[address].token1).balanceOf(address)) / Math.pow(10, constant.CoinInfoMap[constant.PoolInfoMap[address].token1].decimal)
        const poolName = constant.PoolInfoMap[address].poolName
        const token0Symbol = constant.CoinInfoMap[constant.PoolInfoMap[address].token0].symbol
        const token1Symbol = constant.CoinInfoMap[constant.PoolInfoMap[address].token1].symbol

        //TODO: add more price symbol for exact token price
        let tvlApproximate = 0
        if (token0Symbol == "WBNB" || token1Symbol == "WBNB") {
          const WBNB_price = (await getPriceBySymbol("wbnb", ctx.timestamp))!
          tvlApproximate = WBNB_price * (token0_amount + token1_amount)
        }
        tvlApproximate = token0_amount + token1_amount

        ctx.meter.Gauge("tvl").record(tvlApproximate, {
          pool: ctx.address,
          token0Symbol,
          token1Symbol,
          poolName,
          project: "pancake",
        })
      }
      catch (e) { console.log(`${e.message} at ${address} pool ${ctx.chainId} ${ctx.address}`) }
    }, 1440, 120)
}

