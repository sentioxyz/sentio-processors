import {BigDecimal, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { SushiPairProcessor, SushiPairContext } from './types/eth/sushipair.js'
import { BentoBoxV1Processor, BentoBoxV1Context} from './types/eth/bentoboxv1.js'
import {getPriceByType, token} from "@sentio/sdk/utils";

const CONTRACT_MAP = new Map<string, string>([
    ["ILV-WETH", "0x6a091a3406e0073c3cd6340122143009adac0eda"],
    ["USDC-WETH", "0x397ff1542f962076d0bfe58ea045ffa2d347aca0"],
    ["WETH-USDT", "0x06da0fd433c1a5d7a4faa01111c044910a184553"],
    ["WBTC-WETH", "0xceff51756c56ceffca006cd410b03ffc46dd3a58"],
    ["SUSHI-WETH", "0x795065dcc9f64b5614c407a6efdc400da6221fb0"],
    ["SYN-WETH", "0x4a86c01d67965f8cb3d0aaa2c655705e64097c31"],
])

async function getPriceByTokenInfo(amount: bigint, addr: string,
                                   token: token.TokenInfo,
                                   chainID: string, timestamp: Date): Promise<BigDecimal> {
    let price : any
    try {
        price = await getPriceByType(chainID, addr, timestamp)
    } catch (e) {
        console.log(e)
        console.log("get price failed", addr, chainID)
        return BigDecimal(0)
    }

    let scaledAmount = amount.scaleDown(token.decimal)
    return scaledAmount.multipliedBy(price)
}

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

// define gauge for stake
const vol = Gauge.register("vol", volOptions)
const loan = Gauge.register("loan", volOptions)

CONTRACT_MAP.forEach((addr, name) => {
    SushiPairProcessor.bind({address: addr, name: name})
        .onEventSwap(async (evt, ctx) => {
            const amount0In = evt.args.amount0In
            const amount0Out = evt.args.amount0Out
            const amount1In = evt.args.amount1In
            const amount1Out = evt.args.amount1Out
            const token0 = await ctx.contract.token0({blockTag: "latest"})
            const token1 = await ctx.contract.token1({blockTag: "latest"})
            const token0Info = await token.getERC20TokenInfo(ctx, token0)
            const token1Info = await token.getERC20TokenInfo(ctx, token1)
            let price = BigDecimal(0)
            if (amount0In > BigInt(0)) {
                price = await getPriceByTokenInfo(amount0In, token0, token0Info, ctx.chainId.toString(), ctx.timestamp)
            }
            if (amount0Out > BigInt(0)) {
                price = await getPriceByTokenInfo(amount0Out, token0, token0Info, ctx.chainId.toString(), ctx.timestamp)
            }
            if (amount1In > BigInt(0)) {
                price = await getPriceByTokenInfo(amount1In, token1, token1Info, ctx.chainId.toString(), ctx.timestamp)
            }
            if (amount1Out > BigInt(0)) {
                price = await getPriceByTokenInfo(amount1Out, token1, token1Info, ctx.chainId.toString(), ctx.timestamp)
            }
            if (!isNaN(price.toNumber())) {
                vol.record(ctx, price)
            }
            ctx.eventLogger.emit("swap", {
                distinctId: evt.args.sender,
                value: price,
            })
        })
})

BentoBoxV1Processor.bind({address: "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966"})
    .onEventLogFlashLoan(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        const amount = evt.args.amount
        const price = await getPriceByTokenInfo(amount, evt.args.token, tokenInfo, ctx.chainId.toString(), ctx.timestamp)
        if (!isNaN(price.toNumber())) {
            loan.record(ctx, price)
        }
        ctx.eventLogger.emit("flashloan", {
            distinctId: evt.args.borrower,
            token: tokenInfo.symbol,
            value: price,
        })
    })
    .onEventLogDeposit(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("deposit", {
            distinctId: evt.args.from,
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
            from: evt.args.from,
            to: evt.args.to,
        })
    })
    .onEventLogWithdraw(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("withdraw", {
            distinctId: evt.args.to,
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
            from: evt.args.from,
            to: evt.args.to,
        })
    })
    .onEventLogStrategyProfit(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("strategyprofit", {
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
        })
    })
    .onEventLogStrategyLoss(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("strategyloss", {
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
        })
    })
    .onEventLogStrategyInvest(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("strategyinvest", {
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
        })
    })
    .onEventLogStrategyDivest(async (evt, ctx) => {
        const tokenInfo = await token.getERC20TokenInfo(ctx, evt.args.token)
        ctx.eventLogger.emit("strategydivest", {
            value: evt.args.amount.scaleDown(tokenInfo.decimal),
            token: tokenInfo.symbol,
        })
    })





