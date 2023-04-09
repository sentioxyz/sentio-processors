import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { MultiPathProcessor, MultiPathContext } from './types/eth/multipath.js'
import { AugustusSwapperProcessor, AugustusSwapperContext } from './types/eth/augustusswapper.js'

MultiPathProcessor.bind({address: "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"})
.onEventSwappedV3(async (evt, ctx) => {
    ctx.meter.Counter("swaps").add(1)
})
.onEventBoughtV3(async (evt, ctx) => {
    ctx.meter.Counter("buys").add(1)
})

AugustusSwapperProcessor.bind({address: "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"})
.onCallSetImplementation(async (call, ctx) => {
    if (call.error) {
        ctx.meter.Counter("setImplementationErrors").add(1)
        return
    }
    console.log("setImplementation", call.args.selector, call.args.implementation.toString())
    ctx.meter.Counter("setImplementations").add(1)
})