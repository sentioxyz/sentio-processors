import { pool } from "./types/sui/cetus-clmm.js"
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import { SuiNetwork } from "@sentio/sdk/sui"
import * as helper from './helper/cetus-clmm.js'


pool.bind({
    startCheckpoint: 1500000n
})
    .onEventSwapEvent(async (event, ctx) => {
        const pool = event.data_decoded.pool
        //if pool is cetus-sui or usdc-cetus
        if (pool == "0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded" ||
            pool == "0x238f7e4648e62751de29c982cbf639b4225547c31db7bd866982d7d56fc2c7a8") {
            const poolInfo = await helper.getOrCreatePool(ctx, pool)
            const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
            const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
            const atob = event.data_decoded.atob
            const symbol_a = poolInfo.symbol_a
            const symbol_b = poolInfo.symbol_b
            const decimal_a = poolInfo.decimal_a
            const decimal_b = poolInfo.decimal_b
            const pairName = poolInfo.pairName
            const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, atob ? decimal_a : decimal_b)
            const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, atob ? decimal_b : decimal_a)
            const fee_amount = Number(event.data_decoded.fee_amount)
            const partner = event.data_decoded.partner
            const ref_amount = event.data_decoded.ref_amount
            const steps = event.data_decoded.steps
            const vault_a_amount = event.data_decoded.vault_a_amount
            const vault_b_amount = event.data_decoded.vault_b_amount

            const usd_volume = await helper.calculateSwapVol_USD(poolInfo.type, amount_in, amount_out, atob, ctx.timestamp)
            if (usd_volume >= 5) {
                ctx.meter.Counter("swap_counter").add(1, { project: "cetus" })
                ctx.eventLogger.emit("SwapEvent", {
                    distinctId: ctx.transaction.transaction.data.sender,
                    pool,
                    before_sqrt_price,
                    after_sqrt_price,
                    amount_in,
                    amount_out,
                    usd_volume,
                    fee_amount,
                    atob,
                    partner,
                    ref_amount,
                    steps,
                    vault_a_amount,
                    vault_b_amount,
                    coin_symbol: atob ? symbol_a : symbol_b, //for amount_in
                    pairName,
                    project: "cetus",
                    message: `Swap ${amount_in} ${atob ? symbol_a : symbol_b} to ${amount_out} ${atob ? symbol_b : symbol_a}. USD value: ${usd_volume} in Pool ${pairName} `
                })
            }
        }
    })
    .onEventAddLiquidityEvent(async (event, ctx) => {
        const pool = event.data_decoded.pool
        if (pool == "0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded" ||
            pool == "0x238f7e4648e62751de29c982cbf639b4225547c31db7bd866982d7d56fc2c7a8") {
            const poolInfo = await helper.getOrCreatePool(ctx, pool)
            const pairName = poolInfo.pairName
            const decimal_a = poolInfo.decimal_a
            const decimal_b = poolInfo.decimal_b
            const position = event.data_decoded.position
            const tick_lower = Number(event.data_decoded.tick_lower.bits)
            const tick_upper = Number(event.data_decoded.tick_upper.bits)
            const liquidity = Number(event.data_decoded.liquidity)
            const after_liquidity = Number(event.data_decoded.after_liquidity)
            const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
            const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

            const value = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
            if (value >= 5) {
                ctx.meter.Counter("add_liquidity_counter").add(1, { project: "cetus" })

                ctx.eventLogger.emit("AddLiquidityEvent", {
                    distinctId: ctx.transaction.transaction.data.sender,
                    pool,
                    position,
                    tick_lower,
                    tick_upper,
                    liquidity,
                    after_liquidity,
                    amount_a,
                    amount_b,
                    value,
                    pairName,
                    project: "cetus",
                    message: `Add USD$${value} Liquidity in ${pairName}`
                })
            }
        }
    })