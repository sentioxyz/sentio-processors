import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {VaultProcessor, VaultContext } from './types/eth/vault.js'
import {MetaStablePoolProcessor, MetaStablePoolContext} from './types/eth/metastablepool.js'

VaultProcessor.bind({address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8"}).
onEventSwap(async (event, ctx) => {
}).onEventPoolRegistered(async (event, ctx) => {
    console.log(event.args.poolAddress, event.args.poolId)
})

MetaStablePoolProcessor.bind({address: "0x32296969Ef14EB0c6d29669C550D4a0449130230"})
    .onEventTransfer(async (evt, ctx) =>{
        console.log(evt.args.from, evt.args.to)
})

