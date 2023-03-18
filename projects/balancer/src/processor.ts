import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {VaultProcessor, VaultContext, FlashLoanCallTrace} from './types/eth/vault.js'
import {MetaStablePoolProcessor, MetaStablePoolContext} from './types/eth/metastablepool.js'
import {ComposableStablePoolProcessor} from './types/eth/composablestablepool.js'

VaultProcessor.bind({address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8"})
    .onCallFlashLoan(async (call:FlashLoanCallTrace, ctx) => {
        if (call.error) {
            return
        }
        // ["asdf", "aasdf"].join(" ")
        ctx.eventLogger.emit("flashLoan", {
            distinctId: call.args.recipient,
            amounts: call.args.amounts.join(" "),
            tokens: call.args.tokens.join(" "),
        })
    })
    .onCallBatchSwap(async (call, ctx) => {
        if (call.error) {
            return
        }
        for (let i=0;i<call.args.swaps.length; i++) {
            ctx.eventLogger.emit("batchSwap", {
                    distinctId: call.args.funds.sender,
                    amount: call.args.swaps[i].amount,
                }
            )
        }
    })

    .onCallSwap(async (call, ctx) => {
        if (call.error) {
            return
        }
    ctx.eventLogger.emit("swap", {
        distinctId: call.args.funds.sender,
        amount: call.args.singleSwap.amount,
        assetIn: call.args.singleSwap.assetIn,
        assetOut: call.args.singleSwap.assetOut,
        poolId: call.args.singleSwap.assetOut,
    })
})
