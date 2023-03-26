import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { StableSwapPoolProcessor, StableSwapPoolContext } from './types/eth/stableswappool.js'

// define a constant string array for 3 tokens
const readonlyArray = ["DAI", "USDC", "USDT"] as const;

StableSwapPoolProcessor.bind({address:"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"})
    .onEventAddLiquidity(async (evt, ctx)=>{
        for (let i=0;i<evt.args.token_amounts.length;i++) {
            ctx.meter.Counter("add_liquidity").add(evt.args.token_amounts[i],
                {coin_symbol: readonlyArray[i]})
        }
    })
    .onEventRemoveLiquidity(async (evt, ctx)=>{
        for (let i=0;i<evt.args.token_amounts.length;i++) {
            ctx.meter.Counter("remove_liquidity").add(evt.args.token_amounts[i],
                {coin_symbol: readonlyArray[i]})
        }
    })
    .onEventTokenExchange(async (evt, ctx)=>{
        ctx.meter.Counter("token_exchange").add(evt.args.tokens_sold, {"type": "sold"})
        ctx.meter.Counter("token_exchange").add(evt.args.tokens_bought, {"type": "bought"})
    })
