import { SuiBaseProcessor, SuiContext } from "@sentio/sdk/sui"
import * as constant from './helper/constant.js'
import { WHITELISTED_TYPE_MAP } from "./helper/constant.js";
import { MoveFetchConfig, EventFilter } from "@sentio/sdk/move";
import { recordClmmV3SwapEvent, recordAmmV2SwapEvent, recordClobSwapEvent, recordMultiAssetSwapEvent, recordClmmV3LiquidityEvent, recordAmmV2LiquidityEvent, recordClobLiquidityEvent, recordMultiAssetLiquidityEvent } from './helper/dex-helper.js'
import { LRUCache } from 'lru-cache'
import { GrpcTypes } from '@mysten/sui/grpc'
import type { SuiEventInput } from '@typemove/sui'
import { HandlerOptions } from "@sentio/sdk"
import './dex-tvl.js'

type SuiEvent = GrpcTypes.Event

class GeneralProcessor extends SuiBaseProcessor {
    public override onMoveEvent<T extends SuiEventInput = SuiEventInput>(handler: (event: T, ctx: SuiContext) => void,
        filter: EventFilter | EventFilter[],
        handlerOptions?: HandlerOptions<MoveFetchConfig, T>): GeneralProcessor {
        return super.onMoveEvent(handler, filter, handlerOptions) as GeneralProcessor
    }
}

// const processedMap = new Set<string>()

const ttl = 6 * 60 * 60 * 1000 // 6 hour in milliseconds
const processedMap = new LRUCache<string, Promise<any>>({
    max: 1000000,
    ttl: ttl
})

for (const tp of WHITELISTED_TYPE_MAP.values()) {
    const [address, module, type] = tp.split("::")
    const processor = new GeneralProcessor(module, {
        address
        // startCheckpoint: 22000000n,
        // startCheckpoint: 28572927n
    })

    processor.onMoveEvent(
        async (_, ctx) => {
            const digest = ctx.transaction.digest ?? ""
            if (processedMap.has(digest)) {
                return
            }
            processedMap.set(digest, Promise.resolve())

            //debug
            // if (ctx.transaction.digest != "2iwdo3mPuR1Mq8mo1UuEJC1uYL2SQJY64Ngz4GeB9yxY") return

            if (ctx.transaction.events?.events) {
                await handleSwapEvents(ctx.transaction.events.events, ctx)
                await handleLiquidityEvents(ctx.transaction.events.events, ctx)
            } else {
                console.log("no events")
            }
        }, {
        type: `${module}::${type}`
    },
        {
            inputs: true,
            allEvents: true
        }
    )
}


async function handleSwapEvents(events: SuiEvent[], ctx: SuiContext) {
    //handle different dex events
    for (const event of events) {
        if (!event.eventType) { continue }
        //v3: cetus and turbos dex swap
        if (event.eventType.includes(constant.CETUS_SWAP_TYPE)
            || event.eventType.includes(constant.TURBOS_SWAP_TYPE)) {
            await recordClmmV3SwapEvent(event, ctx)
        }

        //v2: kriya spot, flowx, interest protocol
        if (event.eventType.includes(constant.KRIYA_SWAP_TYPE)
            || event.eventType.includes(constant.FLOWX_SWAP_TYPE)
            || event.eventType.includes(constant.IPX_SWAP_TYPE)) {
            await recordAmmV2SwapEvent(event, ctx)
        }

        //deepbook
        if (event.eventType.includes(constant.DEEPBOOK_TYPE)) {
            await recordClobSwapEvent(event, ctx)
        }

        //curve: aftermath
        if (event.eventType.includes(constant.AFTERMATH_SWAP_TYPE)) {
            await recordMultiAssetSwapEvent(event, ctx)
        }
    }

}


async function handleLiquidityEvents(events: SuiEvent[], ctx: SuiContext) {
    //handle different dex events
    for (const event of events) {
        if (!event.eventType) { continue }

        //v3: cetus and turbos dex add/remove liquidity
        if (event.eventType.includes(constant.CETUS_REMOVE_LIQUIDITY_TYPE) || event.eventType.includes(constant.CETUS_ADD_LIQUIDITY_TYPE)
            || event.eventType.includes(constant.TURBOS_REMOVE_LIQUIDITY_TYPE) || event.eventType.includes(constant.TURBOS_ADD_LIQUIDITY_TYPE)) {
            await recordClmmV3LiquidityEvent(event, ctx)
        }

        //v2: kriya spot, flowx, interest protocol
        if (event.eventType.includes(constant.KRIYA_ADD_LIQUIDITY_TYPE) || event.eventType.includes(constant.KRIYA_REMOVE_LIQUIDITY_TYPE)
            || event.eventType.includes(constant.FLOWX_ADD_LIQUIDITY_TYPE) || event.eventType.includes(constant.FLOWX_REMOVE_LIQUIDITY_TYPE)
            || event.eventType.includes(constant.IPX_ADD_LIQUIDITY_TYPE) || event.eventType.includes(constant.IPX_REMOVE_LIQUIDITY_TYPE)
        ) {
            await recordAmmV2LiquidityEvent(event, ctx)
        }

        // //deepbook
        // if (event.eventType.includes(constant.DEEPBOOK_TYPE)) {
        // }

        //curve: aftermath
        if (event.eventType.includes(constant.AFTERMATH_ADD_LIQUIDITY_TYPE)
            || event.eventType.includes(constant.AFTERMATH_REMOVE_LIQUIDITY_TYPE)) {
            await recordMultiAssetLiquidityEvent(event, ctx)
        }


    }

}