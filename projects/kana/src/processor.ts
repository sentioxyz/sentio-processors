import { kana_aggregatorv1 } from './types/aptos/KanalabsV0.js'
import { KanalabsAggregatorV1, KanalabsRouterV1 } from './types/aptos/KanalabsAggregatorV1.js'
import { Aggregator } from './types/aptos/KanaAggregator.js'

import { aggregator } from './types/aptos/hippoAggregator.js'
import { getPrice, getCoinInfo, whiteListed } from "@sentio/sdk/aptos/ext"
import { Counter, Gauge } from "@sentio/sdk"
import { type_info } from "@sentio/sdk/aptos/builtin/0x1"

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  }
}


const totalTx = Counter.register("tx")

const volCounter = Counter.register("vol_counter")
const vol = Gauge.register("vol")
const routes = Gauge.register("routes")
const routesCounter = Counter.register("routes_counter")

// v1
kana_aggregatorv1.bind()
  .onEventSwapStepEvent(async (event, ctx) => {
    ctx.meter.Counter('swap_step_event_emit').add(1)
    const dexType = event.data_decoded.dex_type
    const poolType = event.data_decoded.pool_type
    const inputAmount = event.data_decoded.input_amount
    const outputAmount = event.data_decoded.output_amount
    const xType = extractTypeName(event.data_decoded.x_type_info)
    const yType = extractTypeName(event.data_decoded.y_type_info)

    const timestamp = event.data_decoded.time_stamp

    const coinXInfo = getCoinInfo(xType)
    const coinYInfo = getCoinInfo(yType)
    const symbolX = coinXInfo.symbol
    const symbolY = coinYInfo.symbol
    const priceX = await getPrice(xType, Number(timestamp))
    const priceY = await getPrice(yType, Number(timestamp))
    const pair = constructPair(xType, yType)
    const volume = Number(inputAmount.scaleDown(coinXInfo.decimals).multipliedBy(priceX))
    // console.log("volume1", volume)
    const displayPair = constructDisplay(symbolX, symbolY)


    totalTx.add(ctx, 1, { tag: "kana" })
    ctx.meter.Gauge("tx_gauge").record(1)

    if (whiteListed(xType)) {
      vol.record(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, contractName: "kana aggregator v1" })
      volCounter.add(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, tag: "kana", contractName: "kana aggregator v1" })
      ctx.eventLogger.emit("swap", {
        distinctId: ctx.transaction.sender,
        volume: volume,
        dex: getDex(dexType, KANA_DEX_MAP),
        poolType: poolType.toString(),
        xType: xType,
        yType: yType,
        symbolX: symbolX,
        symbolY: symbolY,
        pair: displayPair,
        tag: "kana",
        contractName: "kana aggregator v1",
        message: `Legacy Kana contract swap ${volume} ${symbolX} to ${symbolY} through dex ${getDex(dexType, KANA_DEX_MAP)}`
      })

    }

  })


// v2
KanalabsAggregatorV1.bind()
  .onEventSwapStepEvent(async (event, ctx) => {
    ctx.meter.Counter('swap_step_event_emit').add(1)
    const dexType = event.data_decoded.dex_type
    const poolType = event.data_decoded.pool_type
    const inputAmount = event.data_decoded.input_amount
    const outputAmount = event.data_decoded.output_amount
    const xType = extractTypeName(event.data_decoded.x_type_info)
    const yType = extractTypeName(event.data_decoded.y_type_info)

    const timestamp = event.data_decoded.time_stamp

    const coinXInfo = getCoinInfo(xType)
    const coinYInfo = getCoinInfo(yType)
    const symbolX = coinXInfo.symbol
    const symbolY = coinYInfo.symbol
    const priceX = await getPrice(xType, Number(timestamp))
    const priceY = await getPrice(yType, Number(timestamp))
    const pair = constructPair(xType, yType)
    const volume = Number(inputAmount.scaleDown(coinXInfo.decimals).multipliedBy(priceX))
    const displayPair = constructDisplay(symbolX, symbolY)


    totalTx.add(ctx, 1, { tag: "kana" })
    ctx.meter.Gauge("tx_gauge").record(1)

    if (whiteListed(xType)) {
      vol.record(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, contractName: "kana aggregator v2" })
      volCounter.add(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, tag: "kana", contractName: "kana aggregator v2" })
      ctx.eventLogger.emit("swap", {
        distinctId: ctx.transaction.sender,
        // address: '0xcdca128119681f791ddc2283e8c7b364ae22d416c5be95b0faf6aa1818c7afd6',
        // contract: 'KanalabsAggregatorV1',
        volume: volume,
        dex: getDex(dexType, KANA_DEX_MAP),
        poolType: poolType.toString(),
        xType: xType,
        yType: yType,
        symbolX: symbolX,
        symbolY: symbolY,
        pair: displayPair,
        tag: "kana",
        contractName: "kana aggregator v2",
        message: `New Kana contract swap ${volume} ${symbolX} to ${symbolY} through dex ${getDex(dexType, KANA_DEX_MAP)}`
      })
      ctx.eventLogger.emit("any", {
        distinctId: ctx.transaction.sender
      })
    }

  })

KanalabsRouterV1.bind()
  .onEventRouteCount((async (event, ctx) => {
    const routeType = Number(event.data_decoded.type)
    routes.record(ctx, 1, { routeType: getRoute(routeType) })
    routesCounter.add(ctx, 1, { routeType: getRoute(routeType) })

    ctx.eventLogger.emit("route", {
      distinctId: ctx.transaction.sender,
      tag: "kana",
      contractName: "kana router v2",
    })


  }))

//v3
Aggregator.bind()
  .onEventSwapStepEvent(async (event, ctx) => {
    ctx.meter.Counter('swap_step_event_emit').add(1)
    const dexType = event.data_decoded.dex_type
    const poolType = event.data_decoded.pool_type
    const inputAmount = event.data_decoded.input_amount
    const outputAmount = event.data_decoded.output_amount
    const xType = extractTypeName(event.data_decoded.x_type_info)
    const yType = extractTypeName(event.data_decoded.y_type_info)

    const timestamp = event.data_decoded.time_stamp

    const coinXInfo = getCoinInfo(xType)
    const coinYInfo = getCoinInfo(yType)
    const symbolX = coinXInfo.symbol
    const symbolY = coinYInfo.symbol
    const priceX = await getPrice(xType, Number(timestamp))
    const priceY = await getPrice(yType, Number(timestamp))
    const pair = constructPair(xType, yType)
    const volume = Number(inputAmount.scaleDown(coinXInfo.decimals).multipliedBy(priceX))
    const displayPair = constructDisplay(symbolX, symbolY)


    totalTx.add(ctx, 1, { tag: "kana" })
    ctx.meter.Gauge("tx_gauge").record(1)

    if (whiteListed(xType)) {
      vol.record(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, contractName: "kana aggregator v3" })
      volCounter.add(ctx, volume, { dex: getDex(dexType, KANA_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, tag: "kana", contractName: "kana aggregator v3" })
      ctx.eventLogger.emit("swap", {
        distinctId: ctx.transaction.sender,
        volume: volume,
        dex: getDex(dexType, KANA_DEX_MAP),
        poolType: poolType.toString(),
        xType: xType,
        yType: yType,
        symbolX: symbolX,
        symbolY: symbolY,
        pair: displayPair,
        tag: "kana",
        contractName: "kana aggregator v3",
        message: `KanaAggregator swap ${volume} ${symbolX} to ${symbolY} through dex ${getDex(dexType, KANA_DEX_MAP)}`
      })
      ctx.eventLogger.emit("any", {
        distinctId: ctx.transaction.sender
      })
    }
  })


//hippo aggregator
aggregator.bind({ address: "0x89576037b3cc0b89645ea393a47787bb348272c76d6941c574b053672b848039" })
  .onEventSwapStepEvent(async (evt, ctx) => {
    const timestamp = evt.data_decoded.time_stamp
    const inputAmount = evt.data_decoded.input_amount
    const outputAmount = evt.data_decoded.output_amount
    const dexType = evt.data_decoded.dex_type
    const xType = extractTypeName(evt.data_decoded.x_type_info)
    const yType = extractTypeName(evt.data_decoded.y_type_info)
    const coinXInfo = getCoinInfo(xType)
    const coinYInfo = getCoinInfo(yType)
    const poolType = evt.data_decoded.pool_type
    const priceX = await getPrice(xType, Number(timestamp))
    const priceY = await getPrice(yType, Number(timestamp))
    const pair = constructPair(xType, yType)
    const volume = Number(inputAmount.scaleDown(coinXInfo.decimals).multipliedBy(priceX))
    const symbolX = coinXInfo.symbol
    const symbolY = coinYInfo.symbol
    const displayPair = constructDisplay(symbolX, symbolY)
    totalTx.add(ctx, 1, { tag: "hippo" })
    if (whiteListed(xType)) {
      vol.record(ctx, volume, { dex: getDex(dexType, HIPPO_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, contractName: "hippo aggregator" })
      volCounter.add(ctx, volume, { dex: getDex(dexType, HIPPO_DEX_MAP), poolType: poolType.toString(), xType: xType, yType: yType, symbolX: symbolX, symbolY: symbolY, pair: displayPair, tag: "hippo", contractName: "hippo aggregator" })
      ctx.eventLogger.emit("swap", {
        distinctId: ctx.transaction.sender,
        volume: volume,
        dex: getDex(dexType, HIPPO_DEX_MAP),
        poolType: poolType.toString(),
        xType: xType,
        yType: yType,
        symbolX: symbolX,
        symbolY: symbolY,
        pair: displayPair,
        tag: "hippo",
        contractName: "hippo aggregator",
        message: `Hippo swap ${volume} ${symbolX} to ${symbolY} through dex ${getDex(dexType, HIPPO_DEX_MAP)}`
      })
      ctx.eventLogger.emit("any", {
        distinctId: ctx.transaction.sender
      })
    }
  })

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

function extractTypeName(typeInfo: type_info.TypeInfo) {
  var rawName = hex_to_ascii(typeInfo.struct_name)
  if (rawName.startsWith("Coin<")) {
    return rawName.substring(5, rawName.length - 1)
  } else {
    return rawName
  }
}

function hex_to_ascii(str1: String) {
  var hex = str1.toString();
  if (hex.startsWith("0x")) {
    hex = hex.substring(2)
  }
  var str = ''
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16))
  }
  return str
}


function getDex(dex: number, map: Map<number, string>) {
  if (map.has(dex)) {
    return map.get(dex)!
  } else {
    return 'dex_unk_' + dex.toString()
  }
}

const KANA_DEX_MAP = new Map<number, string>([
  [1, 'Liquidswap'],
  [2, 'Aptoswap'],
  [3, 'Basiq'],
  [4, 'PancakeSwap'],
  [5, 'Cetus'],
  [6, 'Animeswap'],
  [7, 'Aux'],
  [8, 'Orbic']
])

const HIPPO_DEX_MAP = new Map<number, string>([
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

function getRoute(routeType: number) {
  if (KANA_ROUTE_MAP.has(routeType)) {
    return KANA_ROUTE_MAP.get(routeType)!
  } else {
    return 'route_unk_' + routeType.toString()
  }
}

const KANA_ROUTE_MAP = new Map<number, string>([
  [1, 'SWAP'],
  [2, 'STAKE'],
  [3, 'UNSTAKE'],
  [4, 'TRANSFER'],
  [5, 'CLAIM'],
  [6, 'SWAP_STAKE'],
  [7, 'STAKE_SWAP'],
  [8, 'UNSTAKE_SWAP'],
  [9, 'SWAP_TRANSFER'],
  [10, 'CLAIM_SWAP'],
  [11, 'CLAIM_SWAP_STAKE'],
  [12, 'STAKE_SWAP_TRANSFER'],
  [13, 'UNSTAKE_SWAP_TRANSFER'],
])
