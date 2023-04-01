import {BigDecimal, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { SushiPairProcessor, SushiPairContext } from './types/eth/sushipair.js'
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
                                   ctx:SushiPairContext, type: string) {
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
        vol.record(ctx, scaledAmount.multipliedBy(price), {token: token.symbol, type: type})
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
const vol = Gauge.register("vol", volOptions)

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
            if (amount0In > BigInt(0)) {
                await getPriceByTokenInfo(amount0In, token0, token0Info, ctx, "swap")
            }
            if (amount0Out > BigInt(0)) {
                await getPriceByTokenInfo(amount0Out, token0, token0Info, ctx, "swap")
            }
            if (amount1In > BigInt(0)) {
                await getPriceByTokenInfo(amount1In, token1, token1Info, ctx, "swap")
            }
            if (amount1Out > BigInt(0)) {
                await getPriceByTokenInfo(amount1Out, token1, token1Info, ctx, "swap")
            }
        })

})




