import {aggregator, coin, optional_aggregator} from "@sentio/sdk/aptos/builtin/0x1";
import { getPrice, whitelistCoins, initCoinList } from "@sentio/sdk/aptos/ext";
import {delay} from "@sentio/sdk/aptos/ext";
import {totalValue} from "./metrics.js";
import {AptosResourcesProcessor, defaultMoveCoder, getAptosClient} from "@sentio/sdk/aptos";

const client = getAptosClient()!

// coin.loadTypes(defaultMoveCoder())
// initCoinList().then(() => {
  console.log("whitelist", Array.from(whitelistCoins().values()))

  for (const token of whitelistCoins().values()) {
    const coinInfoType = `0x1::coin::CoinInfo<${token.token_type.type}>`
    AptosResourcesProcessor.bind({address: token.token_type.account_address})
        .onTimeInterval(async (resources, ctx) => {
          const coinInfoRes = await defaultMoveCoder().filterAndDecodeResources(coin.CoinInfo.type(), resources)
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
                aggString = await client.getTableItem({
                  handle: agg.handle,
                  data: {
                    key: agg.key,
                    key_type: "address",
                    value_type: "u128"
                  },
                  options: {
                    ledgerVersion: ctx.version
                  }
                })
              } catch (e) {
                if (e.status === 429) {
                  const random =  Math.floor(Math.random() * 1000);
                  await delay(1000 + random)
                } else {
                  throw e
                }
              }
            }
            amount = BigInt(aggString)
          }

          const price = await getPrice(token.token_type.type, ctx.timestampInMicros)
          const value = amount.scaleDown(coinInfo.decimals).multipliedBy(price)
          if (value.isGreaterThan(0)) {
            totalValue.record(ctx, value, {coin: token.symbol, bridge: token.bridge, type: token.token_type.type})
          }
        }, 60, 60 * 12, coinInfoType)
  }
// })