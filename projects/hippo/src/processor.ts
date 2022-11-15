import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";

import { aggregator } from './types/aptos/aggregator'
import { type_info } from "@sentio/sdk/lib/builtin/aptos/0x1"
import { amm } from './types/aptos/auxexchange'
import { liquidity_pool } from "./types/aptos/liquidswap";
import { stake_router } from "./types/aptos/tortuga";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { Exporter } from "@sentio/sdk/lib/core/exporter";
import { getPrice, getCoinInfo, whiteListed } from "@sentio-processor/common/dist/aptos/coin"
import { scaleDown } from "@sentio-processor/common/dist/aptos/coin";
// import { TypeInfo } from "@manahippo/coin-list/dist/src/stdlib/type_info";

const commonOptions = { sparse:  false }

const liquidityAdd = new Counter("liquidity_add_num", commonOptions)
const liquidityRemoved = new Counter("liquidity_remove_num", commonOptions)
const swap = new Counter("swap_num", commonOptions)

const stake = new Counter("stake_num", commonOptions)
const stakeAmount = new Counter("stake_amount", commonOptions)
const unstake = new Counter("unstake_num", commonOptions)
const unstakeAmount = new Counter("unstake_amount", commonOptions)
const claim = new Counter("claim_num", commonOptions)
const claimAmount = new Counter("claim_amount", commonOptions)

const vol = new Gauge("vol", commonOptions)
const totalTx = new Counter("tx", commonOptions)
const tvl = new Counter("tvl", commonOptions)

const accountTracker = AccountEventTracker.register("users")
const exporter = Exporter.register("tortuga", "test_channel")

aggregator.bind({address: "0x89576037b3cc0b89645ea393a47787bb348272c76d6941c574b053672b848039"})
.onEventSwapStepEvent( async (evt, ctx) => {
  const timestamp = evt.data_typed.time_stamp
  const inputAmount = evt.data_typed.input_amount
  const outputAmount = evt.data_typed.output_amount
  const dexType = evt.data_typed.dex_type
  const xType = extractTypeName(evt.data_typed.x_type_info)
  const yType = extractTypeName(evt.data_typed.y_type_info)

  const coinXInfo = getCoinInfo(xType)
  const coinYInfo = getCoinInfo(yType)
  const poolType = evt.data_typed.pool_type
  const priceX =  await getPrice(xType, Number(timestamp))
  const priceY =  await getPrice(yType, Number(timestamp))
  const pair = constructPair(xType, yType)
  const volume = scaleDown(inputAmount, coinXInfo.decimals).multipliedBy(priceX)
  const symbolX = coinXInfo.symbol
  const symbolY = coinYInfo.symbol
  const displayPair = constructDisplay(symbolX, symbolY)


  accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
  totalTx.add(ctx, 1)
  if (whiteListed(xType)) {
    vol.record(ctx, volume, {dex: getDex(dexType), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair})
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