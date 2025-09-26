// Sentio processor for coinbase's staking token cbETH
import {BurnEvent, MintEvent, StakedTokenV1Context, StakedTokenV1Processor, TransferEvent} from './types/eth/stakedtokenv1.js'
import {getPriceByType, token} from "@sentio/sdk/utils"
import {BigDecimal, Counter, Gauge} from "@sentio/sdk"
import {EthChainId} from "@sentio/sdk/eth";
import {CBETH_PROXY,} from "./constant.js"

// commonly used option for Gauge
// set sparse to true
// and aggregation interval to 60 min
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

// event handler for Mint event
// record the amount of each mint event, along with token symbol as label
// recording both intantaneous amount as gauge and cumulative amount as counter
const mintEventHandler = async function (event: MintEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.amount.scaleDown(tokenInfo.decimal)
    mint.record(ctx, amount, {token: tokenInfo.symbol})
    mintAcc.add(ctx, amount, {token: tokenInfo.symbol})
}

// event handler for Burn event
// record the amount of each mint event, along with token symbol as label
// recording both intantaneous amount as gauge and cumulative amount as counter
const burnEventHandler = async function (event: BurnEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.amount.scaleDown(tokenInfo.decimal)
    burn.record(ctx, amount, {token: tokenInfo.symbol})
    burnAcc.add(ctx, amount, {token: tokenInfo.symbol})
}


// event handler for Transfer event
// record the amount of each mint event, along with token symbol as label
// recording both intantaneous amount as gauge and cumulative amount as counter
// Also recording a Eventlog for each transfer event, with to address as distinct ID
const transferEventHandler = async function (event: TransferEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.value.scaleDown(tokenInfo.decimal)
    transfer.record(ctx, amount, {token: tokenInfo.symbol})
    transferAcc.add(ctx, amount, {token: tokenInfo.symbol})
    ctx.eventLogger.emit("Transfer", {
        distinctId: event.args.to,
        from: event.args.from,
        to: event.args.to,
        amount: amount,
        message: event.args.from + " transfers " + amount + " cbETH to " + event.args.to,
    })
}

// block handler to record total supply and exchange rate by querying the view functions
// also calcualte TVL by using total supply * eth price
const blockHandler = async function (_: any, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const totalSupply = (await ctx.contract.totalSupply()).scaleDown(tokenInfo.decimal)
    const exchangeRate = (await ctx.contract.exchangeRate()).scaleDown(tokenInfo.decimal)
    ctx.meter.Gauge("total_supply").record(totalSupply, {token: tokenInfo.symbol})
    ctx.meter.Gauge("exchange_rate").record(exchangeRate, {token: tokenInfo.symbol})
    const wethPrice = await getPriceByType(EthChainId.ETHEREUM,
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", ctx.timestamp)
    if (!wethPrice) {
        console.warn("no price found")
        return
    }
    let cbEthPrice
    if (!exchangeRate.isEqualTo(BigDecimal(0))) {
        cbEthPrice = BigDecimal(wethPrice).multipliedBy(exchangeRate)
    } else {
        cbEthPrice = 0
    }
    ctx.meter.Gauge("cbETH_price").record(cbEthPrice, {token: tokenInfo.symbol})
    ctx.meter.Gauge("tvl").record(totalSupply.multipliedBy(cbEthPrice), {token: tokenInfo.symbol})
}

// processor binding logic to bind the right contract address and attach right event and block handlers
StakedTokenV1Processor.bind({address: CBETH_PROXY})
    .onEventTransfer(transferEventHandler)
    .onEventMint(mintEventHandler)
    .onEventBurn(burnEventHandler)
    .onBlockInterval(blockHandler)