import { spot_dex } from "./types/sui/kriyadex.js";
import * as helper from './helper/kriyadex.js'

spot_dex.bind({
    startCheckpoint: 8500000n
})
    .onEventSwapEvent(async (event, ctx) => {
        ctx.meter.Counter("swap_counter").add(1, { project: "cetus" })
        const pool = event.data_decoded.pool_id
        const poolInfo = await helper.getOrCreatePool(ctx, pool)
        //v2 price
        const price = await helper.getPoolPrice(ctx, pool)
        const liquidity = Number(event.data_decoded.reserve_y) * Number(event.data_decoded.reserve_x)

        const symbol_a = poolInfo.symbol_a
        const symbol_b = poolInfo.symbol_b
        const decimal_a = poolInfo.decimal_a
        const decimal_b = poolInfo.decimal_b
        const pairName = poolInfo.pairName
        const pairFullName = poolInfo.pairFullName
        const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, decimal_a)
        const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, decimal_b)

        const usd_volume = await helper.calculateSwapVol_USD(poolInfo.type, amount_in, amount_out, ctx.timestamp)

        ctx.eventLogger.emit("SwapEvent", {
            distinctId: event.sender,
            pool,
            amount_in,
            amount_out,
            usd_volume,
            coin_symbol: symbol_a,
            pairName,
            pairFullName,
            price,
            liquidity,
            project: "kriyadex",
            message: `Swap ${amount_in} ${symbol_a} to ${amount_out} ${symbol_b}. USD value: ${usd_volume} in Pool ${pairName} `
        })
    })


const a = {
    "id": {
        "txDigest": "75DHNir6fyJUgJEYNsKBVwru57J7U8TrGgMzY1KcL3PY",
        "eventSeq": "0"
    },
    "packageId": "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66",
    "transactionModule": "spot_dex",
    "sender": "0x90c02760655d131c0c2bc2cdca56120cf12c34b327d72ba7d45a6cd1d46d1db1",
    "type": "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::SwapEvent<0x2::sui::SUI>",
    "parsedJson": {
        "amount_in": "340536447",
        "amount_out": "215501",
        "pool_id": "0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305",
        "reserve_x": "131896522205",
        "reserve_y": "208006497259449",
        "user": "0x90c02760655d131c0c2bc2cdca56120cf12c34b327d72ba7d45a6cd1d46d1db1"
    },
    "bcs": "YLFPB51Fk3NvkyotqiwnjZ3KnoKXtUBNwJtbAAh4a6t39hxF5FCGgvB3VEKGuZ3Lrg5XE9MUG5nWGfAZQ3vrYV23Bv2eyBu6dtE7wiC4tz2Bqz54bPBYXeVak4zV2ej25QK"
}

