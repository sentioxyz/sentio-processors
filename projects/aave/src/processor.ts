import {BigDecimal, EthChainId, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {PoolContext, PoolProcessor} from './types/eth/pool.js'
import {getPriceByType, token} from "@sentio/sdk/utils";

// a const map from chain name to address.
const CHAIN_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.ETHEREUM, "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"],
    [EthChainId.OPTIMISM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.ARBITRUM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.POLYGON, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.FANTOM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.AVALANCHE, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
])

let tokenMap = new Map<string, Promise<token.TokenInfo | undefined>>()

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

const vol = Gauge.register("vol", volOptions)

async function getTokenInfo(address: string, ctx:PoolContext): Promise<token.TokenInfo | undefined> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        try {
            return await token.getERC20TokenInfo(ctx, address)
        } catch(e) {
            console.log("rpc token is undefined", address, ctx.chainId, e)
            return undefined
        }
    } else {
        return token.NATIVE_ETH
    }
}

async function getOrCreateToken(ctx:PoolContext, token: string) : Promise<token.TokenInfo | undefined>{
    let infoPromise = tokenMap.get(token)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token, ctx)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

async function getPriceByTokenInfo(amount: bigint, addr:string,
                                   ctx:PoolContext, type: string) {
    let token = await getOrCreateToken(ctx, addr)
    if (token == undefined) {
        console.log("token is still undefined", addr, ctx.chainId)
        return BigDecimal(0)
    }
    let price : any
    try {
        price = await getPriceByType(ctx.chainId, addr, ctx.timestamp)
    } catch (e) {
        console.log(e)
        console.log("get price failed", addr, ctx.chainId)
        return BigDecimal(0)
    }

    let scaledAmount = amount.scaleDown(token.decimal)
    let v = scaledAmount.multipliedBy(price)
    if (!isNaN(v.toNumber())) {
        vol.record(ctx, scaledAmount.multipliedBy(price), {token: token.symbol, type: type})
        return v
    }
    return BigDecimal(0)
}

CHAIN_ADDRESS_MAP.forEach((addr, chainId) => {
PoolProcessor.bind({address: addr, network: chainId})
.onEventSupply(async (evt, ctx)=>{
    ctx.meter.Counter("supply_counter").add(1)
    ctx.eventLogger.emit("supply", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
    })
}).onEventWithdraw(async (evt, ctx)=>{
    ctx.meter.Counter("withdraw_counter").add(1)
    // emit event log
    ctx.eventLogger.emit("withdraw", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
        to: evt.args.to,
    })
}).onEventBorrow(async (evt, ctx)=>{
    ctx.meter.Counter("borrow_counter").add(1)
    let value = await getPriceByTokenInfo(evt.args.amount, evt.args.reserve, ctx, "borrow")
    // emit event log
    ctx.eventLogger.emit("borrow", {
        distinctId: evt.args.user,
        amount: evt.args.amount,
        value: value,
        reserve: evt.args.reserve,
        interestRateMode: evt.args.interestRateMode,
        referralCode: evt.args.referralCode,
        borrowRate: evt.args.borrowRate,
    })
}).onEventRepay(async (evt, ctx)=>{
    ctx.meter.Counter("repay_counter").add(1)
    // emit event log
    let value = await getPriceByTokenInfo(evt.args.amount, evt.args.reserve, ctx, "repay")
    ctx.eventLogger.emit("repay", {
        distinctId: evt.args.user,
        repayer: evt.args.repayer,
        amount: evt.args.amount,
        reserve: evt.args.reserve,
        value: value,
    })
}).onEventFlashLoan(async (evt, ctx)=>{
    ctx.meter.Counter("flashloan_counter").add(1)
    // emit event log like before
    let value = await getPriceByTokenInfo(evt.args.amount, evt.args.asset, ctx, "flashloan")
    ctx.eventLogger.emit("flashloan", {
        distinctId: evt.args.initiator,
        amount: evt.args.amount,
        reserve: evt.args.asset,
        interestRateMode: evt.args.interestRateMode,
        premium: evt.args.premium,
        referralCode: evt.args.referralCode,
        target: evt.args.target,
        value: value,
    })
})
})