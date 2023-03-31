import {BigDecimal, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { CUSDCProcessor, CUSDCContext } from './types/eth/cusdc.js'
import {RewardProcessor, RewardContext} from './types/eth/reward.js'
import {ExtProcessor, ExtContext, getExtContract} from './types/eth/ext.js'
import {getPriceByType, token} from "@sentio/sdk/utils";


ExtProcessor.bind({address: "0x285617313887d43256F852cAE0Ee4de4b68D45B0"})

// define map for token
let tokenMap = new Map<string, Promise<token.TokenInfo | undefined>>()

async function getTokenInfo(address: string, chainID: string): Promise<token.TokenInfo | undefined> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        try {
            return await token.getERC20TokenInfo(chainID, address)
        } catch(e) {
            console.log("rpc token is undefined", address, chainID, e)
            return undefined
        }
    } else {
        return token.NATIVE_ETH
    }
}

async function getOrCreateToken(chainID:string, token: string) : Promise<token.TokenInfo | undefined>{
    let infoPromise = tokenMap.get(token)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token, chainID)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

async function getPriceByTokenInfo(amount: bigint, addr: string,
                                   token: token.TokenInfo,
                                   ctx:CUSDCContext, type: string) {
    let price : any
    try {
        price = await getPriceByType(ctx.chainId.toString(), addr, ctx.timestamp)
    } catch (e) {
        console.log(e)
        console.log("get price failed", addr, ctx.chainId)
        return BigDecimal(0)
    }

    let scaledAmount = amount.scaleDown(token.decimal)
    let v = scaledAmount.multipliedBy(price)
    if (!isNaN(v.toNumber())) {
        stake.record(ctx, scaledAmount.multipliedBy(price), {token: token.symbol, type: type})
        return v
    }
    return BigDecimal(0)
}

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

// define gauge for stake
const stake = Gauge.register("vol", volOptions)
CUSDCProcessor.bind({address: "0xc3d688B66703497DAA19211EEdff47f25384cdc3"})
    .onEventSupplyCollateral(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(), evt.args.asset)
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, evt.args.asset, token, ctx, "supply")
        const amount = evt.args.amount.scaleDown(token.decimal)
        const from = evt.args.from
        ctx.eventLogger.emit("supply",
            {
                distinctId: from,
                to: evt.args.dst,
                amount: amount,
            token: token.symbol})
    })
    .onEventWithdrawCollateral(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(), evt.args.asset)
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, evt.args.asset, token, ctx, "withdraw")
        const amount = evt.args.amount.scaleDown(token.decimal)
        ctx.eventLogger.emit("withdraw",
            {
                distinctId: evt.args.from,
                to: evt.args.dst,
                amount: amount,
                token: token.symbol})
    })
    .onEventSupply(async (evt, ctx)=>{
        stake.record(ctx, evt.args.amount.scaleDown(6), {token: "USDC", type: "supply"})
        ctx.eventLogger.emit("supply",{
            distinctId: evt.args.from,
            amount: evt.args.amount.scaleDown(6),
        })
    })
    .onEventWithdraw(async (evt, ctx)=>{
        stake.record(ctx, evt.args.amount.scaleDown(6), {token: "USDC", type: "withdraw"})
        ctx.eventLogger.emit("withdraw",{
            distinctId: evt.args.to,
            amount: evt.args.amount.scaleDown(6),
        })
    })
    .onTimeInterval(async function (_:any, ctx) {
        try {
            const totalSupply = await ctx.contract.totalSupply()
            const totalBorrow = await ctx.contract.totalBorrow()
            ctx.meter.Gauge("total_supply").record(totalSupply.scaleDown(6))
            ctx.meter.Gauge("total_borrow").record(totalBorrow.scaleDown(6))
        } catch (e) {
            console.log("get total supply failed", e)
        }
    })

CUSDCProcessor.bind({address: "0xA17581A9E3356d9A858b789D68B4d866e593aE94"})
    .onEventSupplyCollateral(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(), evt.args.asset)
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, evt.args.asset, token, ctx, "supply")
        const amount = evt.args.amount.scaleDown(token.decimal)
        ctx.eventLogger.emit("supply",
            {
                distinctId: evt.args.from,
                to: evt.args.dst,
                amount: amount,
                token: token.symbol})
    })
    .onEventWithdrawCollateral(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(), evt.args.asset)
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, evt.args.asset, token, ctx, "withdraw")
        const amount = evt.args.amount.scaleDown(token.decimal)
        ctx.eventLogger.emit("withdraw",
            {
                distinctId: evt.args.from,
                to: evt.args.dst,
                amount: amount,
                token: token.symbol})
    })
    .onEventSupply(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(),
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            token, ctx, "supply")
        const amount = evt.args.amount.scaleDown(token.decimal)
        ctx.eventLogger.emit("supply",
            {
                distinctId: evt.args.from,
                to: evt.args.dst,
                amount: amount,
                token: token.symbol})
    })
    .onEventWithdraw(async (evt, ctx)=>{
        const token = await getOrCreateToken(ctx.chainId.toString(),
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        if (token === undefined) {
            return
        }
        await getPriceByTokenInfo(evt.args.amount, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            token, ctx, "withdraw")
        const amount = evt.args.amount.scaleDown(token.decimal)
        ctx.eventLogger.emit("withdraw",
            {
                distinctId: evt.args.from,
                to: evt.args.dst,
                amount: amount,
                token: token.symbol})
    })
    .onTimeInterval(async function (_:any, ctx) {
        try {
            const totalSupply = await ctx.contract.totalSupply()
            const totalBorrow = await ctx.contract.totalBorrow()
            ctx.meter.Gauge("total_supply").record(totalSupply.scaleDown(18))
            ctx.meter.Gauge("total_borrow").record(totalBorrow.scaleDown(18))
        } catch (e) {
            console.log("get total supply failed", e)
        }
    })

RewardProcessor.bind({address: "0x1B0e765F6224C21223AeA2af16c1C46E38885a40"})
    .onEventRewardClaimed(async (evt, ctx)=>{
        ctx.eventLogger.emit("reward_claimed", {
            distinctId: evt.args.recipient,
            amount: evt.args.amount,
            token: evt.args.token,
        })
    })


