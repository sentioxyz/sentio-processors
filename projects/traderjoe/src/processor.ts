import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { LBPairProcessor, LBPairContext } from './types/eth/lbpair.js'
import {EthChainId} from "@sentio/sdk/eth";

LBPairProcessor.bind({address: "0x912CE59144191C1204E64559FE8253a0e49E6548", network: EthChainId.ARBITRUM})
    .onEventSwap(async (evt, ctx)=>{
        ctx.eventLogger.emit("swap", {
            distinctId: evt.args.sender,
            amountIn: evt.args.amountIn,
            amountOut: evt.args.amountOut,
            recipient: evt.args.recipient,
            swapForY: evt.args.swapForY,
            ID: evt.args.id,
        })
    })
