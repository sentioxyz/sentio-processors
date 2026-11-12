import { Counter, Gauge, scaleDown } from "@sentio/sdk";
import { aggregator } from './types/aptos/aggregator.js'
import { type_info } from "@sentio/sdk/aptos/builtin/0x1"
import { getTokenInfoWithFallback } from "@sentio/sdk/aptos/ext"
import { user, market } from "./types/aptos/testnet/econia.js";

user.bind({ address: "0x40b119411c6a975fca28f1ba5800a8a418bba1e16a3f13b1de92f731e023d135" })
  .onEntryDepositFromCoinstore(async (call, ctx) => {
    const coinType = call.type_arguments[0]
    const coin = await getTokenInfoWithFallback(coinType)
    const decimal = coin.decimals
    const amount = call.arguments_decoded[2].scaleDown(decimal)

    ctx.eventLogger.emit("deposit_from_coinstore", {
      coinType: coinType,
      amount: amount,
      message: `${amount} ${coinType} is deposited`
    })

    ctx.meter.Counter("deposit_from_coinstore_counter").add(1, { coinType })
  })

market.bind({ address: "0x40b119411c6a975fca28f1ba5800a8a418bba1e16a3f13b1de92f731e023d135" })
  .onEventMakerEvent(async (evt, ctx) => {
    const custodian_id = evt.data_decoded.custodian_id
    const market_id = evt.data_decoded.market_id
    const market_order_id = evt.data_decoded.market_order_id
    const price = evt.data_decoded.price
    const side = evt.data_decoded.side
    const size = evt.data_decoded.size
    const type = evt.data_decoded.type
    const user = evt.data_decoded.user

    // ctx.eventLogger.emit("maker2", {
    //   ...evt.data_decoded,
    //   message: `maker: ${user} with ${price}`
    // })

    ctx.eventLogger.emit("maker", {
      custodian_id: custodian_id,
      market_id: market_id,
      market_order_id: market_id,
      price: price,
      side: side,
      size: size,
      type: type,
      user: user,
      message: `maker: ${user} with ${price}`
    })

    ctx.meter.Counter("maker_counter").add(1)

  })
