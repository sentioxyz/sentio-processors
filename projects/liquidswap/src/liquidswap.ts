import { liquidity_pool } from "./types/aptos/liquidswap"

import { aptos } from "@sentio/sdk"

import {
    calculateValueInUsd,
    CORE_TOKENS,
    getCoinInfo,
    getPrice,
    scaleDown,
    whiteListed
} from "@sentio-processor/common/dist/aptos/coin"

import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal"

import { TypedMoveResource } from "@sentio/sdk/lib/aptos/types"
import { MoveResource } from "aptos-sdk/src/generated"
import { AptosDex } from "@sentio-processor/common/dist/aptos"
import {
    accountTracker,
    inputUsd,
    lpTracker,
    priceGauge,
    priceGaugeNew,
    priceImpact,
    tvl,
    tvlAll,
    tvlByPool,
    tvlByPoolNew,
    volume
} from "./metrics"
import { AptosResourceContext } from "@sentio/sdk/lib/aptos/context"


// const auxTvlAll = new Gauge("aux_tvl_all", commonOptions)


// const POOL_TYPE = "0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityPool"
//
// const ALL_POOLS = new Set<string>()
// let poolVersion = Long.ZERO

// const tmpFile = path.resolve(os.tmpdir(), "sentio", "cache", "sets")

// interface SavedPools {
//   version: string
//   pools: string[]
// }
//
// function savePool(version: Long, types: string[]) {
//   poolVersion = version
//   const value = types.join(", ")
//   if (!ALL_POOLS.has(value)) {
//     ALL_POOLS.add(value)
//     const data: SavedPools  = { version: poolVersion.toString(), pools: Array.from(ALL_POOLS)}
//     const json = JSON.stringify(data)
//     fs.mkdirSync(path.resolve(tmpFile, ".."), { recursive: true})
//     fs.writeFileSync(tmpFile , json)
//   }
// }
//
// function readPool(version: Long) {
//   if (ALL_POOLS.size !== 0) {
//     return
//   }
//   if (!fs.existsSync(tmpFile)) {
//     return
//   }
//   const json: SavedPools = JSON.parse(fs.readFileSync(tmpFile, "utf-8"))
//   const poolVersion = Long.fromString(json.version)
//   if (version.lte(poolVersion)) {
//     return
//   }
//   console.log("loading pools", json.pools.length)
//
//   for (const x of json.pools) {
//     ALL_POOLS.add(x)
//   }
//   console.log(json)
// }


const liquidSwap = new AptosDex<liquidity_pool.LiquidityPool<any, any, any>>(volume, tvlAll, tvl, tvlByPool, {
    getXReserve: pool => pool.coin_x_reserve.value,
    getYReserve: pool => pool.coin_y_reserve.value,
    getCurve: pool => pool.type_arguments[2],
    poolTypeName: liquidity_pool.LiquidityPool.TYPE_QNAME
})

liquidity_pool.bind()
    .onEventPoolCreatedEvent(async (evt, ctx) => {
        ctx.meter.Counter("num_pools").add(1)
        lpTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})

        // ctx.logger.info("", {user: "-", value: 0.0001})
    })
    .onEventLiquidityAddedEvent(async (evt, ctx) => {
        ctx.meter.Counter("event_liquidity_add").add(1)
        lpTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
    })
    .onEventLiquidityRemovedEvent(async (evt, ctx) => {
        ctx.meter.Counter("event_liquidity_removed").add(1)
        accountTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
    })
    .onEventSwapEvent(async (evt, ctx) => {
        const value = await liquidSwap.recordTradingVolume(ctx,
            evt.type_arguments[0], evt.type_arguments[1],
            evt.data_typed.x_in + evt.data_typed.x_out,
            evt.data_typed.y_in + evt.data_typed.y_out,
            getCurve(evt.type_arguments[2]))

        const coinXInfo = getCoinInfo(evt.type_arguments[0])
        const coinYInfo = getCoinInfo(evt.type_arguments[1])
        // ctx.logger.info(`${ctx.transaction.sender} Swap ${coinXInfo.symbol} for ${coinYInfo.symbol}`, {user: ctx.transaction.sender, value: value.toNumber()})

        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinXInfo.bridge})
        ctx.meter.Counter("event_swap_by_bridge").add(1, {bridge: coinYInfo.bridge})

        accountTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})

    })
    .onEventFlashloanEvent(async (evt, ctx) => {
        const coinXInfo = getCoinInfo(evt.type_arguments[0])
        const coinYInfo = getCoinInfo(evt.type_arguments[1])
        ctx.meter.Counter("event_flashloan_by_bridge").add(1, {bridge: coinXInfo.bridge})
        ctx.meter.Counter("event_flashloan_by_bridge").add(1, {bridge: coinYInfo.bridge})

        accountTracker.trackEvent(ctx, {distinctId: ctx.transaction.sender})
    })

// TODO pool name should consider not just use symbol name
function getPair(coinx: string, coiny: string): string {
    const coinXInfo = getCoinInfo(coinx)
    const coinYInfo = getCoinInfo(coiny)
    if (coinXInfo.symbol.localeCompare(coinYInfo.symbol) > 0) {
        return `${coinYInfo.symbol}-${coinXInfo.symbol}`
    }
    return `${coinXInfo.symbol}-${coinYInfo.symbol}`
}

function getCurve(type: string) {
    if (type.includes("0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Stable")) {
        return "Stable"
    } else {
        return "Uncorrelated"
    }
}

// TODO refactor this
async function syncLiquidSwapPools(resources: MoveResource[], ctx: AptosResourceContext) {

    let pools: TypedMoveResource<liquidity_pool.LiquidityPool<any, any, any>>[]
    pools = aptos.TYPE_REGISTRY.filterAndDecodeResources<liquidity_pool.LiquidityPool<any, any, any>>("0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityPool", resources)

    const volumeByCoin = new Map<string, BigDecimal>()
    const timestamp = ctx.timestampInMicros

    console.log("num of pools: ", pools.length, ctx.version.toString())

    function debugCoin(coin: string) {
        const coinInfo = getCoinInfo(coin)
        if (!["WETH", "zWETH", "APT", "tAPT"].includes(coinInfo.symbol)) {
            return
        }
        console.log("!!! debug", coinInfo.symbol, ", version:", ctx.version.toString())
        for (const pool of pools) {
            if (pool.type_arguments[0] == coin || pool.type_arguments[1] == coin) {
                const coinXInfo = getCoinInfo(pool.type_arguments[0])
                const coinYInfo = getCoinInfo(pool.type_arguments[1])
                console.log(`pool[${getPair(pool.type_arguments[0], pool.type_arguments[1])}] value: ${
                    scaleDown(pool.data_typed.coin_x_reserve.value, coinXInfo.decimals)}, ${
                    scaleDown(pool.data_typed.coin_y_reserve.value, coinYInfo.decimals)
                }`)
            }
        }
    }

    const updated = new Set<string>()
    let tvlAllValue = BigDecimal(0)
    for (const pool of pools) {
        // savePool(ctx.version, pool.type_arguments)
        const coinx = pool.type_arguments[0]
        const coiny = pool.type_arguments[1]
        const whitelistx = whiteListed(coinx)
        const whitelisty = whiteListed(coiny)
        const coinXInfo = getCoinInfo(coinx)
        const coinYInfo = getCoinInfo(coiny)
        let priceX = BigDecimal(0)
        let priceY = BigDecimal(0)
        if (whitelistx) {
            if (!updated.has(coinx)) {
                updated.add(coinx)
                priceX = calcPrice(coinx, pools) ?? BigDecimal(0)
                if (priceX.eq(BigDecimal(0))) {
//                    debugCoin(coinx)
                    priceX = priceInUsd.get(coinx) ?? BigDecimal(0)
                } else {
                    priceInUsd.set(coinx, priceX)
                }
            } else {
                priceX = priceInUsd.get(coinx) ?? BigDecimal(0)
            }
            priceGaugeNew.record(ctx, priceX, {coin: coinXInfo.symbol})
        }
        if (whitelisty) {
            if (!updated.has(coiny)) {
                updated.add(coiny)
                priceY = calcPrice(coiny, pools) ?? BigDecimal(0)
                if (priceY.eq(BigDecimal(0))) {
 //                   debugCoin(coiny)
                    priceY = priceInUsd.get(coiny) ?? BigDecimal(0)
                } else {
                    priceInUsd.set(coiny, priceY)
                }
            } else {
                priceY = priceInUsd.get(coiny) ?? BigDecimal(0)
            }
            priceGaugeNew.record(ctx, priceY, {coin: coinYInfo.symbol})
        }

        if (!whitelistx && !whitelisty) {
            continue
        }

        const pair = getPair(coinx, coiny)
        const curve = getCurve(pool.type_arguments[2])

        const coinx_amount = pool.data_typed.coin_x_reserve.value
        const coiny_amount = pool.data_typed.coin_y_reserve.value

        let poolValue = BigDecimal(0)
        let poolValueNew = BigDecimal(0)
        if (whitelistx) {
            const value = await calculateValueInUsd(coinx_amount, coinXInfo, timestamp)
            poolValue = poolValue.plus(value)
            const valueNew = scaleDown(coinx_amount, coinXInfo.decimals).multipliedBy(priceX)
            poolValueNew = poolValueNew.plus(valueNew)
            // tvlTotal.record(ctx, value, { pool: poolName, type: coinXInfo.token_type.type })

            let coinXTotal = volumeByCoin.get(coinXInfo.token_type.type)
            if (!coinXTotal) {
                coinXTotal = value
            } else {
                coinXTotal = coinXTotal.plus(value)
            }
            volumeByCoin.set(coinXInfo.token_type.type, coinXTotal)

            if (!whitelisty) {
                poolValue = poolValue.plus(value)
                poolValueNew = poolValueNew.plus(valueNew)
                // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type})
            }
        }
        if (whitelisty) {
            const value = await calculateValueInUsd(coiny_amount, coinYInfo, timestamp)
            poolValue = poolValue.plus(value)
            const valueNew = scaleDown(coiny_amount, coinYInfo.decimals).multipliedBy(priceY)
            poolValueNew = poolValueNew.plus(valueNew)
            // tvlTotal.record(ctx, value, { pool: poolName, type: coinYInfo.token_type.type })

            let coinYTotal = volumeByCoin.get(coinYInfo.token_type.type)
            if (!coinYTotal) {
                coinYTotal = value
            } else {
                coinYTotal = coinYTotal.plus(value)
            }
            volumeByCoin.set(coinYInfo.token_type.type, coinYTotal)

            if (!whitelistx) {
                poolValue = poolValue.plus(value)
                poolValueNew = poolValueNew.plus(valueNew)
            }
        }
        if (poolValue.isGreaterThan(0)) {
            tvlByPool.record(ctx, poolValue, {pair, curve})
            tvlByPoolNew.record(ctx, poolValueNew, {pair, curve})

            if (curve == "Uncorrelated") {
                const priceX = await getPrice(coinXInfo.token_type.type, timestamp)
                const priceY = await getPrice(coinYInfo.token_type.type, timestamp)
                if (priceX != 0 && priceY != 0) {
                    const nX = scaleDown(coinx_amount, coinXInfo.decimals)
                    const nY = scaleDown(coiny_amount, coinYInfo.decimals)
                    const fee = scaleDown(pool.data_typed.fee, 4)
                    const feeFactor = fee.div(BigDecimal(1).minus(fee))

                    for (const k of inputUsd) {
                        // impactX = fee / (1 - fee) + inX / nX
                        const inX = BigDecimal(k).div(priceX)
                        const impactX = feeFactor.plus(inX.div(nX))
                        priceImpact.record(ctx, impactX, {
                            pair, curve,
                            fee: fee.toString(),
                            inputUsd: k.toString(),
                            direction: "X to Y"
                        })

                        const inY = BigDecimal(k).div(priceY)
                        const impactY = feeFactor.plus(inY.div(nY))
                        priceImpact.record(ctx, impactY, {
                            pair, curve,
                            fee: fee.toString(),
                            inputUsd: k.toString(),
                            direction: "Y to X"
                        })
                    }
                }
            }
        }
        tvlAllValue = tvlAllValue.plus(poolValue)
    }

    tvlAll.record(ctx, tvlAllValue)

    for (const [k, v] of volumeByCoin) {
        const coinInfo = CORE_TOKENS.get(k)
        if (!coinInfo) {
            throw Error("unexpected coin " + k)
        }
        const price = await getPrice(coinInfo.token_type.type, timestamp)
        priceGauge.record(ctx, price, {coin: coinInfo.symbol})
        if (v.isGreaterThan(0)) {
            tvl.record(ctx, v, {coin: coinInfo.symbol, bridge: coinInfo.bridge, type: coinInfo.token_type.type})
        }
    }
}

const minLocked = 1e4
let priceInUsd: Map<string, BigDecimal> = new Map<string, BigDecimal>()

function calcPrice(coin: string, pools: TypedMoveResource<liquidity_pool.LiquidityPool<any, any, any>>[]) {
    const coinInfo = getCoinInfo(coin)
    if (coinInfo.symbol == "USDC") {
        return BigDecimal(1)
    }
    let maxLocked = BigDecimal(0)
    let maxFrom = ""
    let res = undefined
    for (const pool of pools) {
        const curve = getCurve(pool.type_arguments[2])
        if (curve == "Stable") {
            continue
        }

        if (pool.type_arguments[0] == coin) {
            const coinAmount = scaleDown(pool.data_typed.coin_x_reserve.value, coinInfo.decimals)
            const pairedCoinInfo = getCoinInfo(pool.type_arguments[1])
            const pairedCoinPriceInUsd = priceInUsd.get(pool.type_arguments[1])
            const pairedCoinAmount = scaleDown(pool.data_typed.coin_y_reserve.value, pairedCoinInfo.decimals)
            if (!pairedCoinPriceInUsd) {
                continue
            }

            const locked = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd)
            if (locked.gt(maxLocked) && locked.gt(minLocked)) {
                maxLocked = locked
                maxFrom = getPair(pool.type_arguments[0], pool.type_arguments[1])
                res = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd).div(coinAmount)
            }

        } else if (pool.type_arguments[1] == coin) {
            const coinAmount = scaleDown(pool.data_typed.coin_y_reserve.value, coinInfo.decimals)
            const pairedCoinInfo = getCoinInfo(pool.type_arguments[0])
            const pairedCoinPriceInUsd = priceInUsd.get(pool.type_arguments[0])
            const pairedCoinAmount = scaleDown(pool.data_typed.coin_x_reserve.value, pairedCoinInfo.decimals)
            if (!pairedCoinPriceInUsd) {
                continue
            }

            const locked = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd)
            if (locked.gt(maxLocked) && locked.gt(minLocked)) {
                maxLocked = locked
                maxFrom = getPair(pool.type_arguments[0], pool.type_arguments[1])
                res = pairedCoinAmount.multipliedBy(pairedCoinPriceInUsd).div(coinAmount)
            }
        }
    }
    if (res) {
        console.log(`got price of coin[${coinInfo.symbol}] at [${res}] from pair[${maxFrom}]`)
    } else {
        console.log(`failed to get price of coin[${coinInfo.symbol}]`)
    }
    return res
}

aptos.AptosAccountProcessor.bind({address: "0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948"})
    .onVersionInterval(async (resources, ctx) => syncLiquidSwapPools(resources, ctx))

// const client = new AptosClient("http://coingecko-proxy-server.chain-sync:8646")

// coin.loadTypes(aptos.TYPE_REGISTRY)
// for (const token of CORE_TOKENS.values()) {
//   const coinInfoType = `0x1::coin::CoinInfo<${token.token_type.type}>`
//     // const price = await getPrice(v.token_type.type, timestamp)
//   aptos.AptosAccountProcessor.bind({address: token.token_type.account_address})
//     .onVersionInterval(async (resources, ctx) => {
//       const coinInfoRes = aptos.TYPE_REGISTRY.filterAndDecodeResources<coin.CoinInfo<any>>(coin.CoinInfo.TYPE_QNAME, resources)
//       if (coinInfoRes.length === 0) {
//         return
//       }
//       const coinInfo = coinInfoRes[0].data_typed
//
//       const aggOption = (coinInfo.supply.vec as optional_aggregator.OptionalAggregator[])[0]
//       let amount
//       if (aggOption.integer.vec.length) {
//         const intValue = (aggOption.integer.vec[0] as optional_aggregator.Integer)
//         amount = intValue.value
//       } else {
//         const agg = (aggOption.aggregator.vec[0] as aggregator.Aggregator)
//         let aggString: any
//         while (!aggString) {
//           try {
//             aggString = await client.getTableItem(agg.handle, {
//               key: agg.key,
//               key_type: "address",
//               value_type: "u128"
//             }, {ledgerVersion: ctx.version})
//           } catch (e) {
//             if (e.status === 429) {
//               await delay(1000 + getRandomInt(1000))
//             } else {
//               throw e
//             }
//           }
//         }
//         amount = BigInt(aggString)
//       }
//
//       const price = await getPrice(token.token_type.type, ctx.timestampInMicros)
//       const value = scaleDown(amount, coinInfo.decimals).multipliedBy(price)
//       if (value.isGreaterThan(0)) {
//         totalValue.record(ctx, value, {coin: token.symbol, bridge: token.bridge, type: token.token_type.type})
//       }
//     }, 100000, coinInfoType)
// }