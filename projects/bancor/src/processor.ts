import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {BancorNetworkProcessor } from './types/eth/bancornetwork.js'

BancorNetworkProcessor.bind({address: "0xeEF417e1D5CC832e619ae18D2F140De2999dD4fB"})
.onEventTokensTraded(async (event, ctx) => {
    ctx.meter.Counter("totalTrades").add(1)
    ctx.eventLogger.emit("Trade", {
        sourceToken: event.args.sourceToken,
        targetToken: event.args.targetToken,
        sourceAmount: event.args.sourceAmount,
        targetAmount: event.args.targetAmount,
        trader: event.args.trader,
        bntAmount: event.args.bntAmount,
        bntFeeAmount: event.args.bntFeeAmount,
        message: "Trade " + event.args.sourceAmount.toString() + " " + event.args.sourceToken + " for " + event.args.targetAmount.toString() + " " + event.args.targetToken,
    })
})