import { pool, pool_factory } from "./types/sui/turbos.js";
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as constant from './helper/constant-turbos.js'
import { SuiNetwork } from "@sentio/sdk/sui"
import * as helper from './helper/turbos-clmm-helper.js'
import { Gauge } from "@sentio/sdk";

pool.bind({
    address: constant.CLMM_MAINNET,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: 8500000n
})
    .onEventSwapEvent(async (event, ctx) => {
        ctx.meter.Counter("swap_counter").add(1)
        const pool = event.data_decoded.pool
        const recipient = event.data_decoded.recipient
        const poolInfo = await helper.getOrCreatePool(ctx, pool)
        const atob = event.data_decoded.a_to_b
        const liquidity = Number(event.data_decoded.liquidity)
        const tick_current_index = event.data_decoded.tick_current_index.bits
        const tick_pre_index = event.data_decoded.tick_current_index.bits
        const sqrt_price = Number(event.data_decoded.sqrt_price)
        const protocol_fee = Number(event.data_decoded.protocol_fee)
        const fee_amount = Number(event.data_decoded.fee_amount)
        const is_exact_in = event.data_decoded.is_exact_in

        const symbol_a = poolInfo.symbol_a
        const symbol_b = poolInfo.symbol_b
        const decimal_a = poolInfo.decimal_a
        const decimal_b = poolInfo.decimal_b
        const pairName = poolInfo.pairName
        const pairFullName = poolInfo.pairFullName

        const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
        const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)


        const [usd_volume, price_a, price_b] = await helper.calculateSwapVol_USD(poolInfo.type, amount_a, amount_b, atob, ctx.timestamp)
        let fee_usd = 0
        if (atob) {
            if (price_a) {
                fee_usd = fee_amount / Math.pow(10, decimal_a) * price_a
            }
        } else {
            if (price_b) {
                fee_usd = fee_amount / Math.pow(10, decimal_b) * price_b
            }
        }
        ctx.eventLogger.emit("SwapEvent", {
            distinctId: recipient,
            pool,
            sqrt_price,
            amount_a,
            amount_b,
            price_a,
            price_b,
            atob,
            usd_volume,
            liquidity,
            tick_current_index,
            tick_pre_index,
            protocol_fee,
            is_exact_in,
            fee_amount,
            fee_usd,
            symbol_a,
            symbol_b,
            coin_symbol: atob ? symbol_a : symbol_b, //for amount_in
            pairName,
            pairFullName,
            message: `Swap ${atob ? amount_a : amount_b} ${atob ? symbol_a : symbol_b} to ${atob ? amount_b : amount_a} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairFullName} `
        })


    })
    .onEventMintEvent(async (event, ctx) => {
        ctx.meter.Counter("add_liquidity_counter").add(1)
        const pool = event.data_decoded.pool
        const poolInfo = await helper.getOrCreatePool(ctx, pool)
        const pairName = poolInfo.pairName
        const pairFullName = poolInfo.pairFullName

        const decimal_a = poolInfo.decimal_a
        const decimal_b = poolInfo.decimal_b

        const owner = event.data_decoded.owner
        const tick_lower_index = Number(event.data_decoded.tick_lower_index.bits)
        const tick_upper_index = Number(event.data_decoded.tick_upper_index.bits)
        const liquidity_delta = Number(event.data_decoded.liquidity_delta)
        const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
        const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)
        const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
        const value = value_a + value_b
        ctx.eventLogger.emit("AddLiquidityEvent", {
            distinctId: owner,
            pool,
            tick_lower_index,
            tick_upper_index,
            liquidity_delta,
            amount_a,
            amount_b,
            value,
            pairName,
            pairFullName,
            message: `Add USD$${value} Liquidity in ${pairFullName}`
        })
        ctx.meter.Gauge("add_liquidity_gauge").record(value, { pairName, pairFullName })

    })
    .onEventBurnEvent(async (event, ctx) => {
        ctx.meter.Counter("remove_liquidity_counter").add(1)
        const pool = event.data_decoded.pool
        const poolInfo = await helper.getOrCreatePool(ctx, pool)
        const pairName = poolInfo.pairName
        const pairFullName = poolInfo.pairFullName
        const decimal_a = poolInfo.decimal_a
        const decimal_b = poolInfo.decimal_b

        const owner = event.data_decoded.owner
        const tick_lower_index = Number(event.data_decoded.tick_lower_index.bits)
        const tick_upper_index = Number(event.data_decoded.tick_upper_index.bits)
        const liquidity_delta = Number(event.data_decoded.liquidity_delta)
        const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
        const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)
        const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
        const value = value_a + value_b

        ctx.eventLogger.emit("RemoveLiquidityEvent", {
            distinctId: owner,
            pool,
            tick_lower_index,
            tick_upper_index,
            liquidity_delta,
            amount_a,
            amount_b,
            value,
            pairName,
            pairFullName,
            message: `Remove USD$${value} Liquidity in ${pairFullName}`
        })
        ctx.meter.Gauge("remove_liquidity_gauge").record(value, { pairName, pairFullName })

    })

