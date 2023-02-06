import {aggregator, coin, optional_aggregator} from "@sentio/sdk/aptos/builtin/0x1";
import {CORE_TOKENS, getPrice, scaleDown} from "@sentio-processor/common/aptos";
import {delay, getRandomInt} from "@sentio-processor/common";
import {totalValue} from "./metrics.js";
import {AptosAccountProcessor, defaultMoveCoder, getAptosClient} from "@sentio/sdk/aptos";

const client = getAptosClient()!

coin.loadTypes(defaultMoveCoder())
for (const token of CORE_TOKENS.values()) {
    const coinInfoType = `0x1::coin::CoinInfo<${token.token_type.type}>`
    // const price = await getPrice(v.token_type.type, timestamp)
    AptosAccountProcessor.bind({address: token.token_type.account_address})
        .onTimeInterval(async (resources, ctx) => {
            const coinInfoRes = defaultMoveCoder().filterAndDecodeResources<coin.CoinInfo<any>>(coin.CoinInfo.TYPE_QNAME, resources)
            if (coinInfoRes.length === 0) {
                return
            }
            const coinInfo = coinInfoRes[0].data_decoded
            if (coinInfo.supply.vec.length === 0) {
                return
            }
            const aggOption = (coinInfo.supply.vec as optional_aggregator.OptionalAggregator[])[0]
            let amount
            if (aggOption.integer.vec.length) {
                const intValue = (aggOption.integer.vec[0] as optional_aggregator.Integer)
                amount = intValue.value
            } else {
                const agg = (aggOption.aggregator.vec[0] as aggregator.Aggregator)
                let aggString: any
                while (!aggString) {
                    try {
                        aggString = await client.getTableItem(agg.handle, {
                            key: agg.key,
                            key_type: "address",
                            value_type: "u128"
                        }, {ledgerVersion: ctx.version})
                    } catch (e) {
                        if (e.status === 429) {
                            await delay(1000 + getRandomInt(1000))
                        } else {
                            throw e
                        }
                    }
                }
                amount = BigInt(aggString)
            }

            const price = await getPrice(token.token_type.type, ctx.timestampInMicros)
            const value = scaleDown(amount, coinInfo.decimals).multipliedBy(price)
            if (value.isGreaterThan(0)) {
                totalValue.record(ctx, value, {coin: token.symbol, bridge: token.bridge, type: token.token_type.type})
            }
        }, 60, 60 * 12, coinInfoType)
}