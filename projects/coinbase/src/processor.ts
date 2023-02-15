import {
  CBETH_PROXY,
  USDC_ETH_ORACLE
} from "./constant.js"
import { MintEvent, BurnEvent } from "./types/eth/stakedtokenv1.js"
import { StakedTokenV1Context, StakedTokenV1Processor } from "./types/eth/stakedtokenv1.js"
import { getEACAggregatorProxyContract } from "./types/eth/eacaggregatorproxy.js"
import { token } from "@sentio/sdk/utils"
import {BigDecimal, Counter, Gauge} from "@sentio/sdk"

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

const mint = Gauge.register("mint", volOptions)
const burn = Gauge.register("burn", volOptions)
const mintAcc = Counter.register("mint_acc")
const burnAcc = Counter.register("burn_acc")

const blockHandler = async function(_:any, ctx: StakedTokenV1Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const totalSupply = (await ctx.contract.totalSupply()).scaleDown(tokenInfo.decimal)
  const exchangeRate =(await ctx.contract.exchangeRate()).scaleDown(tokenInfo.decimal)
  ctx.meter.Gauge("total_supply").record(totalSupply, {token: tokenInfo.symbol})
  ctx.meter.Gauge("exchange_rate").record(exchangeRate, {token: tokenInfo.symbol})

  const latestAnswer = await getEACAggregatorProxyContract(USDC_ETH_ORACLE).latestAnswer({blockTag: Number(ctx.blockNumber)})
  // the oracle actually returns USDC/ETH price with 18 decimal
  // so to get ETH/USDC price, just do 1e18.div(result)
  const eth_usdc_price = BigDecimal(10).pow(18).div(latestAnswer.asBigDecimal())

  // divide exchange rate between ETH/cbETH to get cbETH price
  let cbEth_usdc_price
  if (!exchangeRate.isEqualTo(BigDecimal(0))) {
    cbEth_usdc_price = eth_usdc_price.div(exchangeRate)
  } else {
    cbEth_usdc_price = 0
  }
  ctx.meter.Gauge("cbETH_price").record(cbEth_usdc_price, {token: tokenInfo.symbol})
  ctx.meter.Gauge("tvl").record(totalSupply.multipliedBy(cbEth_usdc_price), {token: tokenInfo.symbol})
}

const mintEventHandler = async function(event: MintEvent, ctx: StakedTokenV1Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)
  mint.record(ctx, amount, {token: tokenInfo.symbol})
  mintAcc.add(ctx, amount, {token: tokenInfo.symbol})
}

const burnEventHandler = async function(event: BurnEvent, ctx: StakedTokenV1Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)
  burn.record(ctx, amount, {token: tokenInfo.symbol})
  burnAcc.add(ctx, amount, {token: tokenInfo.symbol})
}

StakedTokenV1Processor.bind({address: CBETH_PROXY})
  .onBlockInterval(blockHandler)
  .onEventMint(mintEventHandler)
  .onEventBurn(burnEventHandler)