import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { LidoProcessor, LidoContext } from './types/eth/lido.js'
import {WstETHProcessor, WstETHContext} from './types/eth/wsteth.js'


LidoProcessor.bind({address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"})
    .onEventSubmitted(async (evt, ctx)=>{
        ctx.meter.Counter("eth_submitted").add(evt.args.amount.scaleDown(18))
        ctx.eventLogger.emit("submitted", {
            distinctId: evt.args.sender,
            amount: evt.args.amount.scaleDown(18),
        })
    })
    .onEventSharesBurnt(async (evt, ctx)=>{
        ctx.meter.Counter("lido_shares_burnt").add(evt.args.sharesAmount)
}).onEventELRewardsReceived(async (evt, ctx)=>{
    ctx.meter.Counter("lido_el_rewards_received").add(evt.args.amount.scaleDown(18))
}).onTimeInterval(async (_:any, ctx)=>{
    try {
        const total_supply = await ctx.contract.totalSupply()
        ctx.meter.Gauge("lido_total_supply").record(total_supply.scaleDown(18))
        const reward = await ctx.contract.getTotalELRewardsCollected()
        ctx.meter.Gauge("lido_total_rewards").record(reward.scaleDown(18))
    } catch (e) {
        console.log(e)
    }
}).onEventTransfer(async (evt, ctx)=>{
    ctx.eventLogger.emit("transfer_stETH", {
        distinctId: evt.args.to,
        amount: evt.args.value.scaleDown(18),
    })
})

WstETHProcessor.bind({address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"})
    .onTimeInterval(async (_:any, ctx)=>{
        try {
            const total_supply = await ctx.contract.totalSupply()
            ctx.meter.Gauge("wsteth_total_supply").record(total_supply.scaleDown(18))
            const per_token = await ctx.contract.stEthPerToken()
            ctx.meter.Gauge("wsteth_per_token").record(per_token.scaleDown(18))
        } catch (e) {
            console.log(e)
        }
    }).onEventTransfer(async (evt, ctx)=>{
        ctx.eventLogger.emit("transfer_wstETH", {
            distinctId: evt.args.to,
            amount: evt.args.value.scaleDown(18),
        })
})


