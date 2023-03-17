import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {VaultProcessor, VaultContext } from './types/eth/vault.js'
import {MetaStablePoolProcessor, MetaStablePoolContext} from './types/eth/metastablepool.js'

VaultProcessor.bind({address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8"})
    .onCallSwap(async (call, tx) => {
        if (call.error) {
            return
        }
    console.log(call.args.funds.sender, call.args.funds.recipient,
        call.args.singleSwap.amount, call.args.singleSwap.assetIn)
})

/*
MetaStablePoolProcessor.bind({address: "0x32296969Ef14EB0c6d29669C550D4a0449130230"})
.onEventTransfer(async (evt, ctx) =>{
        console.log(evt.args.from, evt.args.to)
})
*/
