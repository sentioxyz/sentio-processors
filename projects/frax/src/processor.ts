import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { FRAXStablecoinProcessor, FRAXStablecoinContext } from './types/eth/fraxstablecoin.js'


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
    const supply = await ctx.contract.totalSupply()
    ctx.meter.Gauge("frax_supply").record(supply.scaleDown(18))
    const col = await ctx.contract.global_collateral_ratio()
    ctx.meter.Gauge("global_collateral_ratio").record(col.scaleDown(18))
    const price = await ctx.contract.frax_price()
    ctx.meter.Gauge("frax_price").record(price.scaleDown(6))
})