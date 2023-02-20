import { StakedTokenV1Context, StakedTokenV1Processor, MintEvent, BurnEvent, TransferEvent  } from './types/eth/stakedtokenv1.js'
import {getPriceByType, token} from "@sentio/sdk/utils"
import {BigDecimal, CHAIN_IDS, Counter, Gauge} from "@sentio/sdk"
import {
  CBETH_PROXY,
} from "./constant.js"

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  }
}

const mint = Gauge.register("mint", volOptions)
const burn = Gauge.register("burn", volOptions)
const transfer = Gauge.register("transfer", volOptions)
const mintAcc = Counter.register("mint_acc")
const burnAcc = Counter.register("burn_acc")
const transferAcc = Counter.register("transfer_acc")

const mintEventHandler = async (event: MintEvent, ctx: StakedTokenV1Context) => {
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

const transferEventHandler = async function(event: TransferEvent, ctx: StakedTokenV1Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const amount = event.args.value.scaleDown(tokenInfo.decimal)
  transferAcc.add(ctx, amount, {token: tokenInfo.symbol})
  transfer.record(ctx, amount, {token: tokenInfo.symbol})
  ctx.eventLogger.emit("NetTransfer", {
        distinctId: event.args.to,
        from: event.args.from,
        to:event.args.to,
        amount: amount,
        message: event.args.to + " received " + amount + " cbETH from " + event.args.from,
      }
  )
  ctx.eventLogger.emit("NetTransfer", {
        distinctId: event.args.from,
        from: event.args.from,
        to:event.args.to,
        amount: amount.multipliedBy(-1),
        message: event.args.from + " transferred " + amount + " cbETH to " + event.args.to,
      }
  )
}

const blockHandler = async function(_:any, ctx: StakedTokenV1Context) {
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address)
  const totalSupply = (await ctx.contract.totalSupply()).scaleDown(tokenInfo.decimal)
  const exchangeRate =(await ctx.contract.exchangeRate()).scaleDown(tokenInfo.decimal)
  ctx.meter.Gauge("total_supply").record(totalSupply, {token: tokenInfo.symbol})
  ctx.meter.Gauge("exchange_rate").record(exchangeRate, {token: tokenInfo.symbol})

  const weth_price = await getPriceByType(CHAIN_IDS.ETHEREUM,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", ctx.timestamp)
  if (!weth_price) {
    console.warn("cannot get price for ETH")
    return
  }
  let cbEth_price
  if (!exchangeRate.isEqualTo(BigDecimal(0))) {
      cbEth_price = BigDecimal(weth_price).dividedBy(exchangeRate)
  } else {
      cbEth_price = 0
  }
  ctx.meter.Gauge("cbETH_price").record(cbEth_price, {token: tokenInfo.symbol})
  ctx.meter.Gauge("tvl").record(totalSupply.multipliedBy(cbEth_price), {token: tokenInfo.symbol})
}


StakedTokenV1Processor.bind({address: CBETH_PROXY}).
onEventTransfer(transferEventHandler).
onBlockInterval(blockHandler).
onEventMint(mintEventHandler).
onEventBurn(burnEventHandler)
