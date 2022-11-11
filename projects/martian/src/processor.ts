import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";
import { getChainQueryClient } from "@sentio/sdk/lib/aptos/utils";
import {AptosResourceContext} from "@sentio/sdk/lib/aptos";

const dailyTxn = new Gauge("txn");
const queryClient = getChainQueryClient()

aptos.AptosAccountProcessor.bind({address: "0x1"})
    .onTimeInterval(async (resources, ctx) => sync(ctx),
    24 * 60)

async function sync(ctx: AptosResourceContext) {
    interface myRow {
        num_failed_txns: number;
        num_successful_txns: number;
        num_total_txns: number;
    }
    let sql = `SELECT  COUNT_IF(success=false) AS num_failed_txns,
                     COUNT_IF(success=true) AS num_successful_txns,
                     COUNT(*) AS num_total_txns 
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
    }
}