import { factory } from './types/sui/0xba153169476e8c3114962261d1edc70de5ad9781b83cc617ecc8c1923191cae0.js';
import { getFlowXPoolId, getOrCreatePool } from "./helper/dex-helper.js"
import { SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as helper from './helper/dex-helper.js'

//flowx
factory
    .bind({}).
    onEventPairCreated(async (event, ctx) => {
        //@ts-ignore
        const pool = await getFlowXPoolId(ctx, event.data_decoded.coin_x, event.data_decoded.coin_y)
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
            const coin_a_balance = Number(self.fields.value.fields.reserve_x.fields.balance) / Math.pow(10, poolInfo.decimal_a)
            //@ts-ignore
            const coin_b_balance = Number(self.fields.value.fields.reserve_y.fields.balance) / Math.pow(10, poolInfo.decimal_b)

            //record one side tvl
            const tvl_a = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_a, coin_a_balance)
            const tvl_b = await helper.calculateSingleTypeValueUSD(ctx, poolInfo.type_b, coin_b_balance)
            const tvl = tvl_a + tvl_b
            const project = "flowx"

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


