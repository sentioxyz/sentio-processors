import { Counter, Gauge, scaleDown } from "@sentio/sdk";

import { aggregator } from './types/aptos/aggregator.js'
import { type_info } from "@sentio/sdk/aptos/builtin/0x1"
import { getPrice, getCoinInfo, whiteListed } from "@sentio/sdk/aptos/ext"

const commonOptions = { sparse:  false }
export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  }
}

const vol = Gauge.register("vol", volOptions)
const totalTx = Counter.register("tx", commonOptions)
const cumeVol = Counter.register("cumeVol", commonOptions)

// const tvl = new Counter("tvl", commonOptions)

// const accountTracker = AccountEventTracker.register("users")
// const exporter = Exporter.register("tortuga", "test_channel")

aggregator.bind({address: "0x89576037b3cc0b89645ea393a47787bb348272c76d6941c574b053672b848039"})
.onEventSwapStepEvent( async (evt, ctx) => {
  const timestamp = evt.data_decoded.time_stamp
  const inputAmount = evt.data_decoded.input_amount
  const outputAmount = evt.data_decoded.output_amount
  const dexType = evt.data_decoded.dex_type
  const xType = extractTypeName(evt.data_decoded.x_type_info)
  const yType = extractTypeName(evt.data_decoded.y_type_info)
  const coinXInfo = getCoinInfo(xType)
  const coinYInfo = getCoinInfo(yType)
  const poolType = evt.data_decoded.pool_type
  const priceX =  await getPrice(xType, Number(timestamp))
  const priceY =  await getPrice(yType, Number(timestamp))
  const pair = constructPair(xType, yType)
  const volume = scaleDown(inputAmount, coinXInfo.decimals).multipliedBy(priceX)
  const symbolX = coinXInfo.symbol
  const symbolY = coinYInfo.symbol
  const displayPair = constructDisplay(symbolX, symbolY)


  // accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
  ctx.eventLogger.emit("user",{ distinctId: ctx.transaction.sender} )
  var volBucket = "nan"
  if (volume.lte(1)) {
    volBucket = "lt1"
  } else if (volume.lte(10)) {
    volBucket = "1to10"
  } else if (volume.lte(100)) {
    volBucket = "10to100"
  } else if (volume.lte(1000)) {
    volBucket = "100to1000"
  } else if (volume.lte(10000)) {
    volBucket = "1000to10000"
  } else {
    volBucket = "gt10000"
  }
  const wallet = ctx.transaction.sender
  totalTx.add(ctx, 1, {volBucket})
  if (whiteListed(xType)) {
    vol.record(ctx, volume, {dex: getDex(dexType), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, volBucket: volBucket})
    cumeVol.add(ctx, volume, {dex: getDex(dexType), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, volBucket: volBucket})
    ctx.eventLogger.emit("vol_event", {
      distinctId: wallet,
      "wallet" : wallet,
      "volBucket": volBucket,
      "value": volume 
    })
  }
})

function extractTypeName(typeInfo: type_info.TypeInfo) {
  var rawName = hex_to_ascii(typeInfo.struct_name)
  if (rawName.startsWith("Coin<")) {
    return rawName.substring(5, rawName.length - 1)
  } else {
    return rawName
  }
}

function constructPair(xType: String, yType: String) {
  if (xType > yType) {
    return xType + "-" + yType
  } else {
    return yType + "-" + xType
  }
}

function constructDisplay(symbolX: String, symbolY: String) {
  if (symbolX > symbolY) {
    return symbolX + "-" + symbolY
  } else {
    return symbolY + "-" + symbolX
  }
}

function hex_to_ascii(str1: String) {
	var hex  = str1.toString();
  if (hex.startsWith("0x")) {
    hex = hex.substring(2)
  }
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
}

function getDex(dex: number) {
  if (DEX_MAP.has(dex)) {
    return DEX_MAP.get(dex)!
  } else {
    return 'UNKNOWN'
  }
}

const DEX_MAP = new Map<number, string>([
  [1, 'HIPPO'],
  [2, 'ECONIA'],
  [3, 'PONTEM'],
  [4, 'BASIQ'],
  [5, 'DITTO'],
  [6, 'TORTUGA'],
  [7, 'APTOSWAP'],
  [8, 'AUX'],
  [9, 'ANIMESWAP'],
  [10, 'CETUS'],
  [11, 'PANCAKE'],
  [12, 'OBRIC']
])