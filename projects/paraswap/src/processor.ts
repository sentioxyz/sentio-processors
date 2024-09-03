import {BigDecimal, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { MultiPathProcessor, MultiPathContext } from './types/eth/multipath.js'
import { AugustusSwapperProcessor, AugustusSwapperContext } from './types/eth/augustusswapper.js'
import {getPriceByType, token} from "@sentio/sdk/utils";


type TokenWithPrice = {
    token: token.TokenInfo,
    price: BigDecimal,
    scaledAmount: BigDecimal,
}

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

// define gauge for trading
const vol = Gauge.register("vol", volOptions)

async function getTokenWithPrice(
    tokenAddr: string, chainID: string,
    timestamp: Date, amount: bigint): Promise<TokenWithPrice | undefined> {
    let tokenInfo: token.TokenInfo
    try {
        tokenInfo = await token.getERC20TokenInfo(chainID as any, tokenAddr)
    } catch (e) {
        console.log("get token failed", e, tokenAddr, chainID)
        return undefined
    }
    let price : any
    let ret: TokenWithPrice = {
        token: tokenInfo,
        price: BigDecimal(0),
        scaledAmount: BigDecimal(0),
    }
    try {
        price = await getPriceByType(chainID as any, tokenAddr, timestamp)
        if (isNaN(price)) {
            console.log("price is NaN", tokenAddr, chainID, timestamp)
            return undefined
        }
        ret.price = BigDecimal(price)
        ret.scaledAmount = amount.scaleDown(tokenInfo.decimal)
        return ret
    } catch (e) {
        console.log("get price failed", e, tokenAddr, chainID)
    }
    return undefined
}


MultiPathProcessor.bind({address: "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"})
.onEventSwappedV3(async (evt, ctx) => {
    ctx.meter.Counter("swaps").add(1)
})
.onEventBoughtV3(async (evt, ctx) => {
    ctx.meter.Counter("buys").add(1)
})
.onCallMegaSwap(async (call, ctx) => {
    if (call.error) {
            ctx.meter.Counter("megaSwapErrors").add(1)
            return
        }
        ctx.meter.Counter("megaSwaps").add(1)
    const token = call.args.data.fromToken
    const amount = call.args.data.fromAmount
    const tokenWithPrice = await getTokenWithPrice(token, ctx.getChainId(), ctx.timestamp, amount)
    if (tokenWithPrice !== undefined) {
        let total = tokenWithPrice.scaledAmount.multipliedBy(tokenWithPrice.price)
        vol.record(ctx, total, {asset: tokenWithPrice.token.symbol})
        ctx.eventLogger.emit("megaswap", {
            takerAsset: tokenWithPrice.token.symbol,
            total: total,
            distinctId: call.action.from,
        })
    }
})
    .onCallMultiSwap(async (call, ctx) => {
        if (call.error) {
            ctx.meter.Counter("multiswap errors").add(1)
            return
        }
        ctx.meter.Counter("multiswaps").add(1)
        const token = call.args.data.fromToken
        const amount = call.args.data.fromAmount
        const tokenWithPrice = await getTokenWithPrice(token, ctx.getChainId(), ctx.timestamp, amount)
        if (tokenWithPrice !== undefined) {
            let total = tokenWithPrice.scaledAmount.multipliedBy(tokenWithPrice.price)
            vol.record(ctx, total, {asset: tokenWithPrice.token.symbol})
            ctx.eventLogger.emit("multiswap", {
                takerAsset: tokenWithPrice.token.symbol,
                total: total,
                distinctId: call.action.from,
            })
        }
    })

AugustusSwapperProcessor.bind({address: "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"})
.onCallSetImplementation(async (call, ctx) => {
    if (call.error) {
        ctx.meter.Counter("setImplementationErrors").add(1)
        return
    }
    ctx.eventLogger.emit("setImplementation", {
        implementation: call.args.implementation,
        selector: call.args.selector,
    })
    ctx.meter.Counter("setImplementations").add(1)
})
