import { spot_dex } from './types/sui/0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66.js';
import { getOrCreatePool } from "./helper/dex-helper.js"
import { SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as helper from './helper/dex-helper.js'

//flowx
spot_dex
    .bind({}).
    onEventPoolCreatedEvent(async (event, ctx) => {
        //@ts-ignore
        const pool = event.data_decoded.pool_id
        template.bind(
            {
                objectId: pool
            },
            ctx
        )
    })

const template = new SuiObjectProcessorTemplate()
    .onTimeInterval(async (self, _, ctx) => {
        if (!self) { return }
        try {
            const poolInfo = await helper.getOrCreatePool(ctx, ctx.objectId)
            //@ts-ignore
            const coin_a_balance = Number(self.fields.token_x) / Math.pow(10, poolInfo.decimal_a)
            //@ts-ignore
            const coin_b_balance = Number(self.fields.token_y) / Math.pow(10, poolInfo.decimal_b)

            //record one side tvl
            const tvl_a = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_a, coin_a_balance)
            const tvl_b = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_b, coin_b_balance)
            const tvl = tvl_a + tvl_b
            const project = "kriya"

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

            ctx.meter.Gauge("one_side_tvl").record(tvl_a, {
                pool: poolInfo.pool,
                type: poolInfo.type_a,
                amount: coin_a_balance.toString(),
                symbol: poolInfo.symbol_a,
                pairName: poolInfo.pairName,
                project
            })

            ctx.meter.Gauge("one_side_tvl").record(tvl_b, {
                pool: poolInfo.pool,
                type: poolInfo.type_b,
                amount: coin_b_balance.toString(),
                symbol: poolInfo.symbol_b,
                pairName: poolInfo.pairName,
                project
            })

        }
        catch (e) {
            console.log(`${e.message} error at ${JSON.stringify(self)}`)
        }
    }, 1440, 1440, undefined, { owned: false })


