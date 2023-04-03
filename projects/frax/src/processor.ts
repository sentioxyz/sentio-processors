import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { FRAXStablecoinProcessor, FRAXStablecoinContext } from './types/eth/fraxstablecoin.js'
import {FRAXSharesProcessor, FRAXSharesContext} from './types/eth/fraxshares.js'
import {FraxswapFactoryProcessor, FraxswapFactoryContext} from './types/eth/fraxswapfactory.js'


export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

// define gauge for trading
const vol = Gauge.register("vol", volOptions)
FRAXStablecoinProcessor.bind({address: "0x853d955acef822db058eb8505911ed77f175b99e"})
.onEventFRAXMinted(async (evt, ctx)=>{
    ctx.meter.Counter("frax").add(evt.args.amount.scaleDown(18))
})
.onEventFRAXBurned(async (evt, ctx)=>{
    ctx.meter.Counter("frax").sub(evt.args.amount.scaleDown(18))
})
.onEventTransfer(async (evt, ctx)=>{
    vol.record(ctx, evt.args.value.scaleDown(18))
})
.onTimeInterval(async (_ : any, ctx)=>{
    try {
        const supply = await ctx.contract.totalSupply()
        ctx.meter.Gauge("frax_supply").record(supply.scaleDown(18))
        const col = await ctx.contract.global_collateral_ratio()
        ctx.meter.Gauge("global_collateral_ratio").record(col.scaleDown(6))
        const price = await ctx.contract.frax_price()
        ctx.meter.Gauge("frax_price").record(price.scaleDown(6))
    } catch (e) {
        console.log(e)
    }
})

FRAXSharesProcessor.bind({address: "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0"})
.onTimeInterval(async (_ : any, ctx)=>{
    try {
        const supply = await ctx.contract.totalSupply()
        ctx.meter.Gauge("frax_shares_supply").record(supply.scaleDown(18))
    } catch (e) {
        console.log(e)
    }
})

FraxswapFactoryProcessor.bind({address: "0x43eC799eAdd63848443E2347C49f5f52e8Fe0F6f"})
.onEventPairCreated(async (evt, ctx)=>{
    ctx.meter.Counter("pair_created").add(1)
})