import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { MultiPathProcessor, MultiPathContext } from './types/eth/multipath.js'

MultiPathProcessor.bind({address: "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"})
.onEventSwappedV3(async (evt, ctx) => {
    ctx.meter.Counter("swaps").add(1)
})
.onEventBoughtV3(async (evt, ctx) => {
    ctx.meter.Counter("buys").add(1)
})