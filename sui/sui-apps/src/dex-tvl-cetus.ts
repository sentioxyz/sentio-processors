import { pool } from "./types/sui/0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb.js"

import * as helper from './helper/dex-helper.js'
import { SuiObjectTypeProcessor } from "@sentio/sdk/sui"

SuiObjectTypeProcessor.bind({
    objectType: pool.Pool.type()
  })
    .onTimeInterval(async (self, _, ctx) => {
        if (!self) { return }
        try {
            const poolInfo = await helper.getOrCreatePool(ctx, ctx.objectId)
            //TODO use base label to get ipx balance_x, balance_y

            //@ts-ignore
            const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, poolInfo.decimal_a)
            //@ts-ignore
            const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, poolInfo.decimal_b)

            //record one side tvl
            const tvl_a = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_a, coin_a_balance)
            const tvl_b = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_b, coin_b_balance)
            const tvl = tvl_a + tvl_b
            const project = "cetus"

            //eventlogs
            ctx.eventLogger.emit("one_side_tvl_gauge", {
                pool: poolInfo.pool,
                tvl: tvl_a,
                type: poolInfo.type_a,
                amount: coin_a_balance,
                symbol: poolInfo.symbol_a,
                pairName: poolInfo.pairName,
                project
            })

            ctx.eventLogger.emit("one_side_tvl_gauge", {
                pool: poolInfo.pool,
                tvl: tvl_b,
                type: poolInfo.type_b,
                amount: coin_b_balance,
                symbol: poolInfo.symbol_b,
                pairName: poolInfo.pairName,
                project
            })

            ctx.eventLogger.emit("tvl_gauge", {
                pool: poolInfo.pool,
                tvl,
                pairName: poolInfo.pairName,
                project
            })


            //metric
            ctx.meter.Gauge("tvl").record(tvl, {
                pool: poolInfo.pool,
                pairName: poolInfo.pairName,
                project
            })


        }
        catch (e) {
            console.log(`${e.message} error at ${JSON.stringify(self)}`)
        }
    }, 1440, 1440)


