import { AptosClient, CoinClient, TokenClient } from 'aptos-sdk'
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import CoinGecko from 'coingecko-api'
import csvjson from './csvjson.json'
import { string } from "@sentio/sdk/src/builtin/aptos/0x1";
import Coin = coin.Coin;
import { aptos } from "@sentio/sdk";

const CoinGeckoClient = new CoinGecko();

const client = new AptosClient("https://aptos-mainnet.nodereal.io/v1/0c58c879d41e4eab8fd2fc0406848c2b/")

const coinInfos = new Map<string, ExtendedCoinInfo>()

// 0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa
// const whitelisted = new Set(["APT", "USDC", "USDT", "WETH" ]) // "DOGE", "UNI", "SHIBA"

export const WHITELISTED_TOKENS: Record<string, any> = {
  "0x1::aptos_coin::AptosCoin": { coingeckoId: "aptos", decimals: 8, bridge: "native" },
  "0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T": { coingeckoId: "usd-coin", decimals: 6, bridge: "wormhole" }, // usdc on eth via wormhole
  "0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T": { coingeckoId: "tether", decimals: 6,  bridge: "wormhole" }, // via wormhole
  "0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T": { coingeckoId: "wrapped-bitcoin", decimals: 8, bridge: "wormhole"  }, // via wormhole
  "0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T": { coingeckoId: "ethereum", decimals: 8,  bridge: "wormhole" }, // via wormhole
  "0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::coin::T": { coingeckoId: "usd-coin", decimals: 6,  bridge: "wormhole" }, // usdc on solana via wormhole
  "0x1000000fa32d122c18a6a31c009ce5e71674f22d06a581bb0a15575e6addadcc::usda::USDA": { coingeckoId: "usd-coin", decimals: 6,  bridge: "native" }, // USD-A
  "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC": { coingeckoId: "usd-coin", decimals: 6, bridge: "LayerZero"}, // via LayerZero
  "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT": { coingeckoId: "tether", decimals: 6,  bridge: "LayerZero"}, // via LayerZero
  "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH": { coingeckoId: "ethereum", decimals: 6,  bridge: "LayerZero"}, // via LayerZero
  "0xdd89c0e695df0692205912fb69fc290418bed0dbe6e4573d744a6d5e6bab6c13::coin::T": { coingeckoId: "solana", decimals: 8,  bridge: "wormhole" },
  "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin": { coingeckoId: "aptos", decimals: 8, bridge: "native" },  // tortuga staked aptos
  "0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos": { coingeckoId: "aptos", decimals: 8, bridge: "native" },  // ditto staked aptos
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::BnbCoin": { coingeckoId: "binancecoin", decimals: 8, bridge: "Celer" },  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::BusdCoin": { coingeckoId: "binance-usd", decimals: 8, bridge: "Celer" },  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::UsdcCoin": { coingeckoId: "usd-coin", decimals: 6, bridge: "Celer"},  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::UsdtCoin": { coingeckoId: "tether", decimals: 6,bridge: "Celer" },  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::DaiCoin": { coingeckoId: "dai", decimals: 8, bridge: "Celer"},  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::WethCoin": { coingeckoId: "ethereum", decimals: 6,bridge: "Celer" },  // Celer
  "0x8d87a65ba30e09357fa2edea2c80dbac296e5dec2b18287113500b902942929d::celer_coin_manager::WbtcCoin": { coingeckoId: "wrapped-bitcoin", decimals: 8,bridge: "Celer" },  // Celer
}

const WHITELISTED_SET = new Set<string>()
for (const [k, v] of Object.entries(WHITELISTED_TOKENS)) {
  WHITELISTED_SET.add(k)
}

export function whiteListed(type: string): boolean {
  return WHITELISTED_SET.has(type)
}

interface ExtendedCoinInfo {
  type: string
  symbol: string
  decimals: number
  bridge: string
}

export async function getCoinInfo(type: string): Promise<ExtendedCoinInfo> {
  if (!whiteListed(type)){
    return {
      type,
      symbol: type.split("::")[2],
      decimals: 1,
      bridge: "none"
    }
  }
  let extInfo = coinInfos.get(type)
  if (!extInfo) {
    const info = await requestCoinInfo(type)
    extInfo = { ...info, type, bridge: WHITELISTED_TOKENS[type].bridge  }
    // const parts = type.split("::")
    // const account = parts[0]
    // while (!extInfo)
    //   try {
    //     const resource = await client.getAccountResource(account, `0x1::coin::CoinInfo<${type}>`)
    //     extInfo = {...resource.data as CoinInfo<any>, type, bridge: WHITELISTED_TOKENS[type].bridge }
    //   } catch (e) {
    //     console.log("rpc error get coin info", type, e)
    //     await delay(1000)
    //   }
  }
  coinInfos.set(type, extInfo)
  return extInfo
}

export async function requestCoinInfo(type: string, version?: bigint): Promise<CoinInfo<any>> {
  const parts = type.split("::")
  const account = parts[0]
  while (true) {
    try {
      const resource = await client.getAccountResource(account, `0x1::coin::CoinInfo<${type}>`, { ledgerVersion: version})
      if (resource) {
        const info = await aptos.TYPE_REGISTRY.decodeResource<CoinInfo<any>>(resource)
        if (info) {
          return info.data_typed
        }
      }
      // return resource.data
      // extInfo = {...resource.data as CoinInfo<any>, type, bridge: WHITELISTED_TOKENS[type].bridge }
    } catch (e) {
      if (e.status === 404) {
        throw Error("coin info not existed at version " + version)
      }
      console.log("rpc error get coin info", type, e)
      await delay(1000)
    }
  }
}

export function scaleDown(n: bigint, decimal: number) {
  // if (decimal === 0) {
  //   throw Error("decimal become 0")
  //   // decimal = 1
  // }
  return new BigDecimal(n.toString()).div(new BigDecimal(10).pow(decimal))
}

const symbolToId = new Map<string, string>()

for (const e of csvjson) {
  symbolToId.set(e.Symbol.toString().toUpperCase(), e.Id.toString())
}

const priceCache = new Map<string, number>()
const lastPriceCache = new Map<string, number>()

export async function getPrice(coin: ExtendedCoinInfo, timestamp: string) {
  // if (!id) {
  //   // console.warn("price api doesn't include", symbol)
  //   if (symbol.includes("USD")) {
  //     return 1
  //   }
  //   if (symbol.includes("ETH")) {
  //     console.log(symbol, "need to be inspected")
  //   }
  //   return 0
  // }
  if (!whiteListed(coin.type)) {
    return 0
  }
  const symbol = coin.symbol
  if (symbol === 'T') {
    console.error(symbol, JSON.stringify(coin), timestamp)
  }

  // if (symbol === "APT" && !coin.type.startsWith("0x1::")) {
  //   return 0
  // }

  // const x =
  const id = WHITELISTED_TOKENS[coin.type].coingeckoId

  const date = new Date(parseInt(timestamp) / 1000)
  const dateStr =  [date.getUTCDate(), date.getUTCMonth()+1, date.getUTCFullYear()].join("-")

  const cacheKey = id + dateStr
  let price = priceCache.get(cacheKey)
  if (!price) {
    while(true) {
      const res = await CoinGeckoClient.coins.fetchHistory(id, {
        date: dateStr,
        localization: false
      })
      if (!res.success) {
        await delay(1000)
        continue
      }
      if (!res.data || !res.data.market_data || !res.data.market_data.current_price || !res.data.market_data.current_price.usd) {
        console.error("no price data for ", symbol, id, dateStr)
        // if (symbol === "LFC") {
        //   price = 0.02864
        // } else {
          // const lastPrice =
          // if (lastPrice) {
          //   return
          // }
        price = lastPriceCache.get(id) || 0

        // }
      } else {
        price = res.data.market_data.current_price.usd
      }
      break
    }
    priceCache.set(cacheKey, price)
    lastPriceCache.set(id, price)
  }

  return price
}

export async function caculateValueInUsd(n: bigint, coinInfo: ExtendedCoinInfo, timestamp: string) {
  // if (coinInfo.decimals === 0) {
  //   return 0
  // }
  //
  // if (coinInfo.name.toLowerCase().includes("wh")) {
  //   console.log(JSON.stringify(coinInfo))
  // }
  const price = await getPrice(coinInfo, timestamp)
  const amount = await scaleDown(n, coinInfo.decimals)
  return amount.multipliedBy(price)
}

export function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}