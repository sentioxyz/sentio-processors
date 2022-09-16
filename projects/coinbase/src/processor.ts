import {
  CBETH_PROXY,
  USDC_ETH_ORACLE
} from "./constant"
import { MintEvent, BurnEvent } from "./types/stakedtokenv1"
import { StakedTokenV1Context, StakedTokenV1Processor } from "./types/stakedtokenv1"
import { getEACAggregatorProxyContract } from "./types/eacaggregatorproxy"
import type { BigNumber } from "ethers"
import { getERC20TokenInfo, NATIVE_ETH, toBigDecimal, TokenInfo } from "@sentio/sdk/lib/utils"
import { BigDecimal } from "@sentio/sdk"

function scaleDown(amount: BigNumber, decimal: number) {
  return toBigDecimal(amount).div(BigDecimal(10).pow(decimal))
}


const blockHandler = async function(_:any, ctx: StakedTokenV1Context) {
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const totalSupply = scaleDown(await ctx.contract.totalSupply(), tokenInfo.decimal)
  const exchangeRate = scaleDown(await ctx.contract.exchangeRate(), tokenInfo.decimal)
  ctx.meter.Gauge("total_supply").record(totalSupply, {token: tokenInfo.symbol})
  ctx.meter.Gauge("exchange_rate").record(exchangeRate, {token: tokenInfo.symbol})

  const latestAnswer = await getEACAggregatorProxyContract(USDC_ETH_ORACLE).latestAnswer({blockTag: ctx.blockNumber.toNumber()})
  // the oracle actually returns USDC/ETH price with 18 decimal
  // so to get ETH/USDC price, just do 1e18.div(result)
  const eth_usdc_price = BigDecimal(10).pow(18).div(toBigDecimal(latestAnswer))


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
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const amount = scaleDown(event.args.amount, tokenInfo.decimal)
  ctx.meter.Gauge("mint").record(amount, {token: tokenInfo.symbol})
  ctx.meter.Counter("mint_acc").add(amount, {token: tokenInfo.symbol})
}

const burnEventHandler = async function(event: BurnEvent, ctx: StakedTokenV1Context) {
  const tokenInfo = await getERC20TokenInfo(ctx.contract.rawContract.address)
  const amount = scaleDown(event.args.amount, tokenInfo.decimal)
  ctx.meter.Gauge("burn").record(amount, {token: tokenInfo.symbol})
  ctx.meter.Counter("burn_acc").add(amount, {token: tokenInfo.symbol})
}

StakedTokenV1Processor.bind({address: CBETH_PROXY})
.onBlock(blockHandler)
.onEventMint(mintEventHandler)
.onEventBurn(burnEventHandler)