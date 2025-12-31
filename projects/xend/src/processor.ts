import { StakedTokenV1Context, StakedTokenV1Processor, MintEvent, BurnEvent, TransferEvent } from './types/eth/stakedtokenv1.js'
import { getPriceByType, token } from "@sentio/sdk/utils"
import { BigDecimal, Counter, Gauge } from "@sentio/sdk"
import { EthChainId } from "@sentio/sdk/eth"
import {
    CBETH_PROXY,
} from "./constant.js"
import { XendStakingContext, XendStakingProcessor } from './types/eth/xendstaking.js'

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

const mintEventHandler = async function (event: MintEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.amount.scaleDown(tokenInfo.decimal)
    mint.record(ctx, amount, { token: tokenInfo.symbol })
    mintAcc.add(ctx, amount, { token: tokenInfo.symbol })
}

const burnEventHandler = async function (event: BurnEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.amount.scaleDown(tokenInfo.decimal)
    burn.record(ctx, amount, { token: tokenInfo.symbol })
    burnAcc.add(ctx, amount, { token: tokenInfo.symbol })
}

const transferEventHandler = async function (event: TransferEvent, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const amount = event.args.value.scaleDown(tokenInfo.decimal)
    transfer.record(ctx, amount, { token: tokenInfo.symbol })
    transferAcc.add(ctx, amount, { token: tokenInfo.symbol })
    ctx.eventLogger.emit("Transfer", {
        distinctId: event.args.to,
        from: event.args.from,
        to: event.args.to,
        amount: amount,
        message: event.args.from + " transfers " + amount + " xend to " + event.args.to,
    })
}

const blockHandler = async function (_: any, ctx: StakedTokenV1Context) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const totalSupply = (await ctx.contract.totalSupply()).scaleDown(tokenInfo.decimal)
    // const exchangeRate =(await ctx.contract.exchangeRate()).scaleDown(tokenInfo.decimal)
    ctx.meter.Gauge("total_supply").record(totalSupply, { token: tokenInfo.symbol })
    // ctx.meter.Gauge("exchange_rate").record(exchangeRate, {token: tokenInfo.symbol})
    // const wethPrice = await getPriceByType(EthChainId.ETHEREUM,
    //     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", ctx.timestamp)
    // if (!wethPrice) {
    //     console.warn("no price found")
    //     return
    // }
    // let cbEthPrice
    // if (!exchangeRate.isEqualTo(BigDecimal(0))) {
    //     cbEthPrice = BigDecimal(wethPrice).dividedBy(exchangeRate)
    // } else {
    //     cbEthPrice = 0
    // }
    // ctx.meter.Gauge("cbETH_price").record(cbEthPrice, {token: tokenInfo.symbol})
    // ctx.meter.Gauge("tvl").record(totalSupply.multipliedBy(cbEthPrice), {token: tokenInfo.symbol})
}

async function getTotalStake(_: any, ctx: XendStakingContext) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, "0x4a080377f83D669D7bB83B3184a8A5E61B500608")
    const totalStaked = (await ctx.contract.getTotalTokenStakesInContract()).scaleDown(tokenInfo.decimal)
    ctx.meter.Gauge("totalStaked").record(totalStaked, { token: tokenInfo.symbol })
}

StakedTokenV1Processor.bind({ address: "0x4a080377f83D669D7bB83B3184a8A5E61B500608", network: EthChainId.BSC })
    .onEventTransfer(transferEventHandler)
    .onEventMint(mintEventHandler)
    .onEventBurn(burnEventHandler)
    .onBlockInterval(blockHandler, 10000, 10000)

XendStakingProcessor.bind({ address: "0x3d4D0699C4Df1539Fdc42C6F9594A478c6929051", network: EthChainId.BSC })
    .onBlockInterval(getTotalStake, 10000, 10000)
