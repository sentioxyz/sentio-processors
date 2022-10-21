import { AptosClient, CoinClient, TokenClient } from 'aptos-sdk'
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import CoinGecko from 'coingecko-api'
import csvjson from './csvjson.json'
import { string } from "@sentio/sdk/src/builtin/aptos/0x1";
import Coin = coin.Coin;

const CoinGeckoClient = new CoinGecko();

const client = new AptosClient("https://mainnet.aptoslabs.com/")

const coinInfos = new Map<string, ExtendedCoinInfo>()

// 0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa
const whitelisted = new Set(["APT", "USDC", "USDT", "WETH" ]) // "DOGE", "UNI", "SHIBA"

interface ExtendedCoinInfo extends CoinInfo<any> {
  type: string
}

export async function getCoinInfo(type: string): Promise<ExtendedCoinInfo> {
  let extInfo = coinInfos.get(type)
  if (!extInfo) {
    const parts = type.split("::")
    const account = parts[0]
    try {
      const resource = await client.getAccountResource(account, `0x1::coin::CoinInfo<${type}>`)
      extInfo = { ...resource.data as CoinInfo<any>, type }
    } catch (e) {
      extInfo = {
        name: parts[2],
        symbol: parts[2],
        decimals: 0,
        supply: {vec:""},
        type
      }
    }
    coinInfos.set(type, extInfo)
  }
  return extInfo!
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

export async function getPrice(coin: ExtendedCoinInfo, timestamp: string) {
  const symbol = coin.symbol
  const id = symbolToId.get(symbol)
  if (!id) {
    // console.warn("price api doesn't include", symbol)
    if (symbol.includes("USD")) {
      return 1
    }
    if (symbol.includes("ETH")) {
      console.log(symbol, "need to be inspected")
    }
    return 0
  }
  if (!whitelisted.has(symbol)) {
    return 0
  }
  if (symbol === "APT" && !coin.type.startsWith("0x1::")) {
    return 0
  }


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
      if (!res.data || !res.data.market_data || !res.data.market_data.current_price) {
        console.error("no price data for ", symbol, id, dateStr)
        if (symbol === "LFC") {
          price = 0.02864
        } else {
          price = 0
        }
      } else {
        price = res.data.market_data.current_price.usd
      }
      break
    }
    priceCache.set(cacheKey, price)
  }

  return price
}

export async function caculateValueInUsd(n: bigint, coinInfo: ExtendedCoinInfo, timestamp: string) {
  // if (coinInfo.decimals === 0) {
  //   return 0
  // }

  if (coinInfo.name.toLowerCase().includes("wh")) {
    console.log(JSON.stringify(coinInfo))
  }
  const price = await getPrice(coinInfo, timestamp)
  const amount = await scaleDown(n, coinInfo.decimals)
  return amount.multipliedBy(price)
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}