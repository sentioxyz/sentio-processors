import { events } from "./types/sui/0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c.js"
import { SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as helper from './helper/dex-helper.js'


events.bind({})
    .onEventCreatedPoolEvent(async (event, ctx) => {
        const pool_id = event.data_decoded.pool_id
        template.bind({
            objectId: pool_id
        }, ctx)
    })

const template = new SuiObjectProcessorTemplate()
    .onTimeInterval(async (self, _, ctx) => {
        if (!self) { return }
        try {
            //@ts-ignore
            const poolInfo = await helper.getOrCreateMultiAssetPool(ctx, ctx.objectId)
            const project = "aftermath"
            let total_tvl = 0

            //@ts-ignore
            for (let i = 0; i < self.fields.coin_decimals.length; i++) {
                //@ts-ignore
                const coinType = `0x${self.fields.type_names[i]}`
                const coinInfo = await helper.getOrCreateCoin(ctx, coinType)
                //@ts-ignore
                const coinBalance = Number(self.fields.normalized_balances[i]) / Math.pow(10, self.fields.coin_decimals[i])
                const tvl = await helper.calculateSingleTypeValueUSD(ctx, coinType, coinBalance)
                total_tvl += tvl


                ctx.eventLogger.emit("one_side_tvl_gauge", {
                    pool: poolInfo.pool,
                    tvl,
                    type: coinType,
                    amount: coinBalance,
                    symbol: coinInfo.symbol,
                    pairName: poolInfo.pairName,
                    project
                })

            }

            ctx.eventLogger.emit("tvl_gauge", {
                pool: poolInfo.pool,
                tvl: total_tvl,
                pairName: poolInfo.pairName,
                project
            })

            ctx.meter.Gauge("tvl").record(total_tvl, {
                pool: poolInfo.pool,
                pairName: poolInfo.pairName,
                project
            })

        }
        catch (e) {
            console.log(`${e.message} error at ${JSON.stringify(self)}`)
        }
    }, 1440, 1440, undefined, { owned: false })


