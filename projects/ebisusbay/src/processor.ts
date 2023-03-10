import { listing } from './types/aptos/seashrine.js'
import { getPrice, getCoinInfo, scaleDown } from "@sentio-processor/common/aptos"
import { Counter, Gauge } from "@sentio/sdk";
import { timestamp, type_info } from "@sentio/sdk/aptos/builtin/0x1"

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  }
}
const commonOptions = { sparse: false }

const vol = Gauge.register("volume", volOptions)
const vol_apt = Gauge.register("volume_apt", volOptions)

// const accountTracker = AccountEventTracker.register("users")
const totalTx = Counter.register("tx", commonOptions)


listing.bind({ startVersion: 6393932 })
  .onEventBuyListingEvent(async (event, ctx) => {
    ctx.meter.Counter('buy_listing').add(1)
    totalTx.add(ctx, 1)

    const originalCoinInfo = event.data_decoded.coin_type
    const coinType = originalCoinInfo.account_address + "::" + hex_to_ascii(originalCoinInfo.module_name) + "::" + hex_to_ascii(originalCoinInfo.struct_name)
    const coinInfo = getCoinInfo(coinType)
    const amount = scaleDown(event.data_decoded.min_price, coinInfo.decimals)

    const timestamp = event.data_decoded.at
    const collection = event.data_decoded.token_id.token_data_id.collection
    const coinPrice = await getPrice(coinType, Number(timestamp))

    const volume = amount.multipliedBy(coinPrice)
    const creator = event.data_decoded.creator



    vol.record(ctx, volume, { creator: creator, collection: collection })
    vol_apt.record(ctx, amount, { creator: creator, collection: collection })
    ctx.eventLogger.emit("buy_listing", {
      distinctId: ctx.transaction.sender,
      amount: amount,
      volume: volume,
      creator: creator,
      collection: collection
    })


  })
  .onEventCancelListingEvent(async (event, ctx) => {
    ctx.meter.Counter('cancel_listing').add(1)
    ctx.eventLogger.emit("cancel_listing", { distinctId: ctx.transaction.sender })


  })
  .onEventCreateListingEvent(async (event, ctx) => {
    ctx.meter.Counter('create_listing').add(1)
    ctx.eventLogger.emit("create_listing", { distinctId: ctx.transaction.sender })


  })
  .onEventUpdateListingEvent(async (event, ctx) => {
    ctx.meter.Counter('update_listing').add(1)
    ctx.eventLogger.emit("update_listing", { distinctId: ctx.transaction.sender })
  })

function hex_to_ascii(str1: String) {
  var hex = str1.toString();
  if (hex.startsWith("0x")) {
    hex = hex.substring(2)
  }
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

function extractTypeName(typeInfo: type_info.TypeInfo) {
  var rawName = hex_to_ascii(typeInfo.struct_name)
  if (rawName.startsWith("Coin<")) {
    return rawName.substring(5, rawName.length - 1)
  } else {
    return rawName
  }
}