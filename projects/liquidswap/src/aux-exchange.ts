import {AptosDex, getCoinInfo, getPair, getPairValue} from "@sentio/sdk/aptos/ext";
import {amm} from "./types/aptos/auxexchange.js";
import {
    auxTvl,
    auxTvlAll,
    auxTvlByPool,
    auxVolume,
    recordAccount,
} from "./metrics.js";
import {AptosAccountProcessor, TypedMoveResource, AptosResourceContext} from "@sentio/sdk/aptos";

const AUX_EXCHANGE = new AptosDex<amm.Pool<any, any>>(auxVolume,
    auxTvlAll, auxTvl, auxTvlByPool, {
    getXReserve: pool => pool.x_reserve.value,
    getYReserve: pool => pool.y_reserve.value,
    getExtraPoolTags: _ => {
    },
    poolTypeName: amm.Pool.TYPE_QNAME
})

AptosAccountProcessor.bind({address: amm.DEFAULT_OPTIONS.address})
    .onTimeInterval((rs, ctx) =>
        AUX_EXCHANGE.syncPools(rs, ctx), 60, 12 * 60)

amm.bind()
    .onEntryCreatePool(async (evt, ctx) => {
        ctx.meter.Counter("num_pools").add(1)
    })
    .onEventAddLiquidityEvent(async (evt, ctx) => {
        if (recordAccount) {
            const value = await getPairValue(ctx, evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type, evt.data_decoded.x_added_au, evt.data_decoded.y_added_au)
            const pair = await getPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)
            ctx.meter.Counter("token_amount_by_pool").add(evt.data_decoded.x_added_au, {"pair": pair, "coin": evt.data_decoded.x_coin_type})
            ctx.meter.Counter("token_amount_by_pool").add(evt.data_decoded.x_added_au, {"pair": pair, "coin": evt.data_decoded.y_coin_type})
            if (value.isGreaterThan(10)) {
                ctx.eventLogger.emit("liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": ctx.transaction.sender,
                    "value": value.toNumber(),
                    "formula_value": value.toNumber() * 2,
                })
                ctx.eventLogger.emit("net_liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": ctx.transaction.sender,
                    "value": value.toNumber(),
                    "formula_value": value.toNumber() * 2,
                })
            } else {
                ctx.eventLogger.emit("liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": "Others",
                    "value": value.toNumber(),
                    "formula_value": value.toNumber() * 2,
                })
                ctx.eventLogger.emit("net_liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": ctx.transaction.sender,
                    "value": value.toNumber(),
                    "formula_value": value.toNumber() * 2,
                })
            }
            const coinXInfo = getCoinInfo(evt.data_decoded.x_coin_type)
            const coinYInfo = getCoinInfo(evt.data_decoded.y_coin_type)
            ctx.eventLogger.emit("add liquidity for " + pair, {
                symbol: coinXInfo.symbol,
                user: ctx.transaction.sender,
                value: value,
                amount: evt.data_decoded.x_added_au,
                pair: pair,
                coin: evt.data_decoded.x_coin_type
            })
            ctx.eventLogger.emit("add liquidity for " + pair, {
                symbol: coinYInfo.symbol,
                user: ctx.transaction.sender,
                value: value,
                amount: evt.data_decoded.y_added_au,
                pair: pair,
                coin: evt.data_decoded.y_coin_type
            })
        }
        ctx.meter.Counter("event_liquidity_add").add(1)
        // ctx.logger.info("LiquidityAdded", { user: ctx.transaction.sender })
    })
    .onEventRemoveLiquidityEvent(async (evt, ctx) => {
        const pair = await getPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)
        ctx.meter.Counter("event_liquidity_removed").add(1)

        ctx.meter.Counter("token_amount_by_pool").sub(evt.data_decoded.x_removed_au, {"pair": pair, "coin": evt.data_decoded.x_coin_type})
        ctx.meter.Counter("token_amount_by_pool").sub(evt.data_decoded.x_removed_au, {"pair": pair, "coin": evt.data_decoded.y_coin_type})

        if (recordAccount) {
            const value = await getPairValue(ctx, evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type, evt.data_decoded.x_removed_au, evt.data_decoded.y_removed_au)
            if (value.isGreaterThan(10)) {
                ctx.eventLogger.emit("net_liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": ctx.transaction.sender,
                    "value": -value.toNumber(),
                    "formula_value": (-value.toNumber()) * 2,
                })
            } else {
                ctx.eventLogger.emit("net_liquidity", {
                    distinctId: ctx.transaction.sender,
                    "account": "Others",
                    "value": -value.toNumber(),
                    "formula_value": (-value.toNumber()) * 2,
                })
            }
        }
    })
    .onEventSwapEvent(async (evt, ctx) => {
        const value = await AUX_EXCHANGE.recordTradingVolume(ctx, evt.data_decoded.in_coin_type, evt.data_decoded.out_coin_type, evt.data_decoded.in_au, evt.data_decoded.out_au)
        if (recordAccount && value.isGreaterThan(10)) {
            ctx.eventLogger.emit("vol", {
                distinctId: ctx.transaction.sender,
                "account": ctx.transaction.sender,
                "value": value.toNumber(),
            })
        }
        const coinXInfo = await getCoinInfo(evt.data_decoded.in_coin_type)
        const coinYInfo = await getCoinInfo(evt.data_decoded.out_coin_type)
        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})
    })
