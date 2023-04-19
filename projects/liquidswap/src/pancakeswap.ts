import {swap} from "./types/aptos/pancake-swap.js";
import {AptosDex, getCoinInfo, getPairValue} from "@sentio/sdk/aptos/ext"

import {
    pancakeTvl,
    pancakeTvlAll,
    pancakeTvlByPool,
    pancakeVolume, pancakeVolumeByCoin,
    recordAccount,
} from "./metrics.js";
import {AptosResourcesProcessor} from "@sentio/sdk/aptos";

swap.bind()
    .onEventPairCreatedEvent(async (evt, ctx) => {
        ctx.meter.Counter("num_pools").add(1)
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
        ctx.meter.Counter("event_liquidity_add").add(1)
        if (recordAccount) {
            const value = await getPairValue(ctx, evt.type_arguments[0], evt.type_arguments[1], evt.data_decoded.amount_x, evt.data_decoded.amount_y)
            if (value.isGreaterThan(10)) {
                ctx.eventLogger.emit("liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": ctx.transaction.sender,
                    "value": value.toNumber(),
                    "formula_value": value.toNumber() * 2,
                })
            }
        }
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
        ctx.meter.Counter("event_liquidity_removed").add(1)
    })
    .onEventSwapEvent(async (evt, ctx) => {
        const value = await PANCAKE_SWAP_APTOS.recordTradingVolume(ctx,
            evt.type_arguments[0], evt.type_arguments[1],
            evt.data_decoded.amount_x_in + evt.data_decoded.amount_x_out,
            evt.data_decoded.amount_y_in + evt.data_decoded.amount_y_out)
        if (recordAccount && value.isGreaterThan(10)) {
            ctx.eventLogger.emit("vol", {
                distinctId: ctx.transaction.sender,
                "account": ctx.transaction.sender,
                "value": value.toNumber(),
            })
        }
        const coinXInfo = await getCoinInfo(evt.type_arguments[0])
        const coinYInfo = await getCoinInfo(evt.type_arguments[1])
        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})
    })

const PANCAKE_SWAP_APTOS = new AptosDex<swap.TokenPairReserve<any, any>>(
    pancakeVolume,
    pancakeVolumeByCoin,
    pancakeTvlAll, pancakeTvl, pancakeTvlByPool, {
    getXReserve: pool => pool.reserve_x,
    getYReserve: pool => pool.reserve_y,
    getExtraPoolTags: _ => {
    },
    poolType: swap.TokenPairReserve.type()
})

AptosResourcesProcessor.bind({address: swap.DEFAULT_OPTIONS.address})
    .onTimeInterval((rs, ctx) =>
        PANCAKE_SWAP_APTOS.syncPools(rs, ctx), 60, 12 * 60)
