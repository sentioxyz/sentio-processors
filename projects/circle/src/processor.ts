import {
  EUROC_PROXY,
  USDC_PROXY
} from "./constant"
import { MintEvent, BurnEvent } from "./types/fiattokenv2"
import { FiatTokenV2Context, FiatTokenV2Processor } from "./types/fiattokenv2"
import type { BigNumber } from "ethers"
import { getERC20TokenInfo, NATIVE_ETH, toBigDecimal, TokenInfo } from "@sentio/sdk/lib/utils"
import { BigDecimal } from "@sentio/sdk"

const DECIMAL = 6
function scaleDown(amount: BigNumber, decimal: number) {
  return toBigDecimal(amount).div(BigDecimal(10).pow(decimal))
}


const totalSupplyHandler = async function(_:any, ctx: FiatTokenV2Context) {
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const totalSupply = scaleDown(await ctx.contract.totalSupply(), DECIMAL)
  ctx.meter.Gauge("total_supply").record(totalSupply, {labels: tokenInfo.symbol})
}

const mintEventHandler = async function(event: MintEvent, ctx: FiatTokenV2Context) {
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const amount = scaleDown(event.args.amount, DECIMAL)
  ctx.meter.Gauge("mint").record(amount, {labels: tokenInfo.symbol})
  ctx.meter.Counter("mint_acc").add(amount, {labels: tokenInfo.symbol})
}

const burnEventHandler = async function(event: BurnEvent, ctx: FiatTokenV2Context) {
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const amount = scaleDown(event.args.amount, DECIMAL)
  ctx.meter.Gauge("burn").record(amount, {labels: tokenInfo.symbol})
  ctx.meter.Counter("burn_acc").add(amount, {labels: tokenInfo.symbol})
}

FiatTokenV2Processor.bind({address: USDC_PROXY})
.onBlock(totalSupplyHandler)
.onEventMint(mintEventHandler)
.onEventBurn(burnEventHandler)

FiatTokenV2Processor.bind({address: EUROC_PROXY})
.onBlock(totalSupplyHandler)
.onEventMint(mintEventHandler)
.onEventBurn(burnEventHandler)