import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { StableSwapPoolProcessor, StableSwapPoolContext } from './types/eth/stableswappool.js'

// define a constant string array for 3 tokens
const readonlyArray = ["DAI", "USDC", "USDT"] as const;
const scaleDownDigits = [18, 6, 6] as const;


const balanceCalc = async function (_: any, ctx: StableSwapPoolContext) {
    for (let i=0;i<3;i++) {
        ctx.meter.Gauge("balance").record((await ctx.contract.balances(i)).scaleDown(scaleDownDigits[i]),
            {"coin_symbol": readonlyArray[i]})
    }
}
StableSwapPoolProcessor.bind({address:"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"})
    .onEventAddLiquidity(async (evt, ctx)=>{
        for (let i=0;i<evt.args.token_amounts.length;i++) {
            ctx.meter.Counter("add_liquidity").add(evt.args.token_amounts[i].scaleDown(scaleDownDigits[i]),
                {coin_symbol: readonlyArray[i]})
            ctx.meter.Gauge("total_supply").record(evt.args.token_supply.scaleDown(18))
        }
        ctx.eventLogger.emit("AddLiquidity", {
            distinctId: evt.args.provider,
            token_amounts: evt.args.token_amounts.join(","),
        })
    })
    .onEventTokenExchange(async (evt, ctx)=>{
        const sold_id = Number(evt.args.sold_id)
        const bought_id = Number(evt.args.bought_id)
        ctx.meter.Counter("token_exchange").add(evt.args.tokens_sold.scaleDown(scaleDownDigits[sold_id]),
            {"type": "sold"})
        ctx.meter.Counter("token_exchange").add(evt.args.tokens_bought.scaleDown(scaleDownDigits[bought_id]),
            {"type": "bought"})
        ctx.eventLogger.emit("TokenExchange", {
            distinctId: evt.args.buyer,
            sold_id: sold_id,
            bought_id: bought_id,
            tokens_sold: evt.args.tokens_sold.scaleDown(scaleDownDigits[sold_id]),
            tokens_bought: evt.args.tokens_bought.scaleDown(scaleDownDigits[bought_id]),
        })
    })
    .onTimeInterval(balanceCalc, 60, 60 * 24 * 90)
