import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";
import { getChainQueryClient } from "@sentio/sdk/lib/aptos/utils";
import {AptosResourceContext} from "@sentio/sdk/lib/aptos";

const dailyTxn = new Gauge("txn");
const accumTxn = new Counter("accum_txn");
const dailyAverageTps = new Gauge("average_tps");

const dau = new Gauge("dau");

const dailyGas = new Gauge("gas")
const accumGas = new Counter("accum_gas")

const queryClient = getChainQueryClient()

aptos.AptosAccountProcessor.bind({address: "0x1"})
    .onTimeInterval(async (resources, ctx) => sync(ctx),
    24 * 60)

async function sync(ctx: AptosResourceContext) {
    interface myRow {
        num_failed_txns: number;
        num_successful_txns: number;
        num_total_txns: number;
        num_user_txns: number;
        average_tps: number;
        estimated_num_unique_users: number;
        total_gas_price: number;
    }
    let sql = `SELECT COUNT_IF(success=false) AS num_failed_txns,
               COUNT_IF(success=true) AS num_successful_txns,
               COUNT_IF(type='user_transaction') AS num_user_txns,
               COUNT(*) AS num_total_txns,
               COUNT(*)/86400 AS average_tps,
               APPROX_COUNT_DISTINCT(sender) AS estimated_num_unique_users,
               SUM(gas_used) / POW(10, 5) AS total_gas_price
               FROM txns WHERE TIMESTAMP between ${(ctx.timestampInMicros - 86400000000).toString()}
               AND ${ctx.timestampInMicros.toString()}`
    console.log(sql)
    let ret = await queryClient.aptosSQLQuery({
        sql: sql,
        network: "aptos_mainnet",
        arbitraryRange: true,
    })
    console.log(ret)
    for (let row of ret.documents) {
        let obj: myRow = JSON.parse(row)
        dailyTxn.record(ctx, obj.num_failed_txns, { kind: "failed"})
        dailyTxn.record(ctx, obj.num_successful_txns, { kind: "successful"})
        dailyTxn.record(ctx, obj.num_total_txns, { kind: "total"})
        dailyTxn.record(ctx, obj.num_user_txns, { kind: "user"})
        accumTxn.add(ctx, obj.num_failed_txns, { kind: "failed"})
        accumTxn.add(ctx, obj.num_successful_txns, { kind: "successful"})
        accumTxn.add(ctx, obj.num_total_txns, { kind: "total"})
        dailyAverageTps.record(ctx, obj.average_tps)
        dau.record(ctx, obj.estimated_num_unique_users)
        dailyGas.record(ctx, obj.total_gas_price)
        accumGas.add(ctx, obj.total_gas_price)
    }
}