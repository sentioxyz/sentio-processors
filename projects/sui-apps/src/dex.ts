import { SuiBaseProcessor, SuiContext, SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui"
import { SuiEvent } from "@mysten/sui.js/client"
import * as constant from './helper/constant.js'
import * as helper from './helper/dex-helper.js'
import { getPriceBySymbol, getPriceByType } from "@sentio/sdk/utils"
import { getOrCreateCoin } from "./helper/dex-helper.js";
import { coin } from "@sentio/sdk/aptos/builtin/0x1"
import { poolInfo, multiAssetPoolInfo } from "./helper/dex-helper.js"
import { WHITELISTED_TYPE_MAP } from "./helper/constant.js";
import { MoveFetchConfig, EventFilter } from "@sentio/sdk/move";
import { recordClmmV3SwapEvent, recordAmmV2SwapEvent, recordClobSwapEvent, recordMultiAssetSwapEvent, recordClmmV3LiquidityEvent, recordAmmV2LiquidityEvent, recordClobLiquidityEvent, recordMultiAssetLiquidityEvent } from './helper/dex-helper.js'
import './dex-tvl.js'

// class GeneralProcessor extends SuiBaseProcessor {
//     public override onMoveEvent(handler: (event: SuiEvent, ctx: SuiContext) => void,
//         filter: EventFilter | EventFilter[],
//         fetchConfig?: Partial<MoveFetchConfig>): GeneralProcessor {
//         return super.onMoveEvent(handler, filter, fetchConfig) as GeneralProcessor
//     }
// }

// const processedMap = new Set<string>()

// for (const tp of WHITELISTED_TYPE_MAP.values()) {
//     const [address, module, type] = tp.split("::")
//     const processor = new GeneralProcessor(module, {
//         address,
//         // startCheckpoint: 22000000n,
//         // startCheckpoint: 28572927n
//     })

//     processor.onMoveEvent(
//         async (_, ctx) => {
//             if (processedMap.has(ctx.transaction.digest)) {
//                 return
//             }
//             processedMap.add(ctx.transaction.digest)

//             //debug
//             // if (ctx.transaction.digest != "2iwdo3mPuR1Mq8mo1UuEJC1uYL2SQJY64Ngz4GeB9yxY") return

//             if (ctx.transaction.events) {
//                 await handleSwapEvents(ctx.transaction.events, ctx)
//                 await handleLiquidityEvents(ctx.transaction.events, ctx)
//             } else {
//                 console.log("no events")
//             }
//         }, {
//         type: `${module}::${type}`
//     },
//         {
//             inputs: true,
//             allEvents: true
//         }
//     )
// }


// async function handleSwapEvents(events: SuiEvent[], ctx: SuiContext) {
//     //handle different dex events
//     for (const event of events) {
//         //v3: cetus and turbos dex swap
//         if (event.type.includes(constant.CETUS_SWAP_TYPE)
//             || event.type.includes(constant.TURBOS_SWAP_TYPE)) {
//             await recordClmmV3SwapEvent(event, ctx)
//         }

//         //v2: kriya spot, flowx, interest protocol
//         if (event.type.includes(constant.KRIYA_SWAP_TYPE)
//             || event.type.includes(constant.FLOWX_SWAP_TYPE)
//             || event.type.includes(constant.IPX_SWAP_TYPE)) {
//             await recordAmmV2SwapEvent(event, ctx)
//         }

//         //deepbook
//         if (event.type.includes(constant.DEEPBOOK_TYPE)) {
//             await recordClobSwapEvent(event, ctx)
//         }

//         //curve: aftermath
//         if (event.type.includes(constant.AFTERMATH_SWAP_TYPE)) {
//             await recordMultiAssetSwapEvent(event, ctx)
//         }
//     }

// }


// async function handleLiquidityEvents(events: SuiEvent[], ctx: SuiContext) {
//     //handle different dex events
//     for (const event of events) {

//         //v3: cetus and turbos dex add/remove liquidity
//         if (event.type.includes(constant.CETUS_REMOVE_LIQUIDITY_TYPE) || event.type.includes(constant.CETUS_ADD_LIQUIDITY_TYPE)
//             || event.type.includes(constant.TURBOS_REMOVE_LIQUIDITY_TYPE) || event.type.includes(constant.TURBOS_ADD_LIQUIDITY_TYPE)) {
//             await recordClmmV3LiquidityEvent(event, ctx)
//         }

//         //v2: kriya spot, flowx, interest protocol
//         if (event.type.includes(constant.KRIYA_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.KRIYA_REMOVE_LIQUIDITY_TYPE)
//             || event.type.includes(constant.FLOWX_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.FLOWX_REMOVE_LIQUIDITY_TYPE)
//             || event.type.includes(constant.IPX_ADD_LIQUIDITY_TYPE) || event.type.includes(constant.IPX_REMOVE_LIQUIDITY_TYPE)
//         ) {
//             await recordAmmV2LiquidityEvent(event, ctx)
//         }

//         // //deepbook
//         // if (event.type.includes(constant.DEEPBOOK_TYPE)) {
//         // }

//         //curve: aftermath
//         if (event.type.includes(constant.AFTERMATH_ADD_LIQUIDITY_TYPE)
//             || event.type.includes(constant.AFTERMATH_REMOVE_LIQUIDITY_TYPE)) {
//             await recordMultiAssetLiquidityEvent(event, ctx)
//         }


//     }

// }