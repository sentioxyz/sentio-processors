import { spot_dex } from './types/sui/0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66.js';
import { getOrCreatePool } from "./helper/dex-helper.js"
import { SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as helper from './helper/dex-helper.js'
import { core } from './types/sui/0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0.js'

core.bind({})
    .onEventPoolCreated(async (event, ctx) => {
        const pool_id = event.data_decoded.id
        template.bind(
            {
                objectId: pool_id
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
            const coin_a_balance = Number(self.fields.balance_x) / Math.pow(10, poolInfo.decimal_a)
            //@ts-ignore
            const coin_b_balance = Number(self.fields.balance_y) / Math.pow(10, poolInfo.decimal_b)

            //record one side tvl
            const tvl_a = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_a, coin_a_balance)
            const tvl_b = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_b, coin_b_balance)
            const tvl = tvl_a + tvl_b
            const project = "ipx"

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


