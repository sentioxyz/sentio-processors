import {
  EUROC_PROXY,
  USDC_PROXY,
  USDC_PROXY_POLYGON
} from "./constant.js"
import { MintEvent, BurnEvent } from "./types/eth/fiattokenv2.js"
import { FiatTokenV2Context, FiatTokenV2Processor } from "./types/eth/fiattokenv2.js"
import { UChildAdministrableERC20Processor, UChildAdministrableERC20Context } from "./types/eth/uchildadministrableerc20.js"
import { token } from "@sentio/sdk/utils"
import {Gauge} from "@sentio/sdk";
const DECIMAL = 6

const totalSupplyHandler = async function(_:any, ctx: FiatTokenV2Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const totalSupply = (await ctx.contract.totalSupply()).scaleDown(DECIMAL)
  ctx.meter.Gauge("total_supply").record(totalSupply, {labels: tokenInfo.symbol})
}

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [5],
  }
}
const mint = Gauge.register("mint", volOptions)
const burn = Gauge.register("burn", volOptions)

const mintEventHandler = async function(event: MintEvent, ctx: FiatTokenV2Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const amount = event.args.amount.scaleDown(DECIMAL)
  mint.record(ctx, amount, {labels: tokenInfo.symbol})
  ctx.meter.Counter("mint_acc").add(amount, {labels: tokenInfo.symbol})
}

const burnEventHandler = async function(event: BurnEvent, ctx: FiatTokenV2Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const amount = event.args.amount.scaleDown(DECIMAL)
  burn.record(ctx, amount, {labels: tokenInfo.symbol})
  ctx.meter.Counter("burn_acc").add(amount, {labels: tokenInfo.symbol})
}

const totalSupplyHandlerPolygon = async function(_:any, ctx: UChildAdministrableERC20Context) {
  const totalSupply = (await ctx.contract.totalSupply()).scaleDown(DECIMAL)
  ctx.meter.Gauge("total_supply_polygon").record(totalSupply)
}

FiatTokenV2Processor.bind({address: USDC_PROXY})
  .onBlockInterval(totalSupplyHandler)
  .onEventMint(mintEventHandler)
  .onEventBurn(burnEventHandler)

FiatTokenV2Processor.bind({address: EUROC_PROXY})
  .onBlockInterval(totalSupplyHandler)
  .onEventMint(mintEventHandler)
  .onEventBurn(burnEventHandler)

UChildAdministrableERC20Processor.bind({address: USDC_PROXY_POLYGON, network: 137})
  .onBlockInterval(totalSupplyHandlerPolygon)