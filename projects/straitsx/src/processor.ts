import { XSGDProcessor, BurnEvent, MintEvent, TransferEvent, XSGDContext, XSGD } from "./types/eth/xsgd.js";
import { XIDRProcessor } from "./types/eth/xidr.js";
import { token } from "@sentio/sdk/utils";
import { UniswapProcessor } from "./types/eth/uniswap.js";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { scaleDown } from "@sentio/sdk";
export const XSGD_ETH = "0x70e8de73ce538da2beed35d14187f6959a8eca96"
export const XSGD_POLYGON = "0xDC3326e71D45186F113a2F448984CA0e8D201995"
export const XIDR_ETH = "0xebF2096E01455108bAdCbAF86cE30b6e5A72aa52"
export const XIDR_POLYGON = "0x2c826035c1C36986117A0e949bD6ad4baB54afE2"
// import './dex.js'

const mintEventHandler = async (event: MintEvent, ctx: XSGDContext) => {
  const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)
  ctx.meter.Gauge("mint").record(amount, { token: tokenInfo.symbol })
  ctx.meter.Counter("mint_counter").add(amount, { token: tokenInfo.symbol })
}

const burnEventHandler = async (event: BurnEvent, ctx: XSGDContext) => {
  const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)
  ctx.meter.Gauge("burn").record(amount, { token: tokenInfo.symbol })
  ctx.meter.Counter("burn_counter").add(amount, { token: tokenInfo.symbol })
}

const transferEventHandler = async (event: TransferEvent, ctx: XSGDContext) => {
  const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)
  ctx.meter.Gauge("transfer").record(amount, { token: tokenInfo.symbol })
  ctx.meter.Counter("transfer_counter").add(amount, { token: tokenInfo.symbol })

  ctx.eventLogger.emit("Transfer", {
    distinctId: event.args.to,
    from: event.args.from,
    to: event.args.to,
    amount: amount,
    message: " transfers " + amount + " XSGD from " + event.args.from + " to " + event.args.to,
  })
}

const timeIntervalHandler = async (_: any, ctx: XSGDContext) => {
  const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
  const totalSupply = (await ctx.contract.totalSupply()).scaleDown(tokenInfo.decimal)

  ctx.meter.Gauge("total_supply").record(totalSupply, { token: tokenInfo.symbol, coin_symbol: "xsgd" })
  //get price
  // ctx.meter.Gauge("tvl").record(totalSupply.multipliedBy(cbEthPrice), { token: tokenInfo.symbol })
}


XSGDProcessor.bind({ address: XSGD_ETH })
  .onEventBurn(burnEventHandler)
  .onEventMint(mintEventHandler)
  .onEventTransfer(transferEventHandler)
  .onTimeInterval(timeIntervalHandler, 60, 60)



UniswapProcessor.bind({ address: "0x6279653c28f138c8b31b8a0f6f8cd2c58e8c1705" })
  .onTimeInterval(async (_, ctx) => {
    const slot0 = await ctx.contract.slot0()
    let sqrtPriceX96 = slot0.sqrtPriceX96
    let token0To1Price = Number(sqrtPriceX96) ** 2 / (2 ** 192)
    ctx.meter.Gauge("XSGD_to_USDC_price").record(token0To1Price, { coin_symbol: "usdc" })
    const liquidity = await ctx.contract.liquidity()
    ctx.meter.Gauge("liquidity").record(liquidity, { poolName: "XSGD/USDC" })

    //XSGD
    const token0Balance = await getERC20Contract(ctx, "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96").balanceOf("0x6279653c28f138c8b31b8a0f6f8cd2c58e8c1705")
    const token0decimal = 6
    const token0BalanceNormalize = Number(scaleDown(token0Balance, token0decimal))
    //USDC
    const token1Balance = await getERC20Contract(ctx, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48").balanceOf("0x6279653c28f138c8b31b8a0f6f8cd2c58e8c1705")
    const token1decimal = 6
    const token1BalanceNormalize = Number(scaleDown(token1Balance, token1decimal))

    ctx.meter.Gauge("XSGD_reserve").record(token0BalanceNormalize, { coin_symbol: "xsgd" })
    ctx.meter.Gauge("USDC_reserve").record(token1BalanceNormalize, { coin_symbol: "usdc" })


  }, 1440, 60)
  .onEventSwap(async (event, ctx) => {
    ctx.meter.Counter("poolSwap").add(1, { poolName: "XSGD/USDC" })

    const amount = Math.abs(Number(event.args.amount1) / Math.pow(10, 6))

    ctx.eventLogger.emit("SwapEvent", {
      distinctId: event.args.sender,
      amount,
      coin_symbol: "usdc"
    })
  })