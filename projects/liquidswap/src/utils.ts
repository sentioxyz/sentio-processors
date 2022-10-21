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

const coinInfos = new Map<string, CoinInfo<any>>()

export async function getCoinInfo(type: string): Promise<CoinInfo<any>> {
  let info = coinInfos.get(type)
  if (!info) {
    const parts = type.split("::")
    const account = parts[0]
    try {
      const resource = await client.getAccountResource(account, `0x1::coin::CoinInfo<${type}>`)
      info = resource.data as CoinInfo<any>
    } catch (e) {
      info = {
        name: parts[2],
        symbol: parts[2],
        decimals: 0,
        supply: {vec:""}
      }
    }
    coinInfos.set(type, info)
  }
  return info
}

export function scaleDown(n: bigint, decimal: number) {
  if (decimal === 0) {
    decimal = 1
  }
  return new BigDecimal(n.toString()).div(new BigDecimal(10).pow(decimal))
}

const symbolToId = new Map<string, string>()

for (const e of csvjson) {
  symbolToId.set(e.Symbol.toString().toUpperCase(), e.Id.toString())
}

const priceCache = new Map<string, number>()

export async function getPrice(symbol: string, timestamp: string) {
  const id = symbolToId.get(symbol)
  if (!id) {
    return 0
  }

  const date = new Date(parseInt(timestamp) / 1000)
  const dateStr =  [date.getUTCDate(), date.getUTCMonth()+1, date.getUTCFullYear()].join("-")

  const cacheKey = id + dateStr
  let price = priceCache.get(cacheKey)
  if (!price) {
    const res = await CoinGeckoClient.coins.fetchHistory(id, {
      date: dateStr,
      localization: false
    })
    if (!res.success) {
      console.error(res.message)
      throw new Error(res.message)
    }
    if (!res.data || !res.data.market_data || !res.data.market_data.current_price) {
      console.error("no price data for ", symbol, id, dateStr)
      price = 0
    } else {
      price = res.data.market_data.current_price.usd
    }
    priceCache.set(cacheKey, price)
  }

  return price
}

export async function caculateValueInUsd(n: bigint, coinInfo: CoinInfo<any>, timestamp: string) {
  if (coinInfo.decimals === 0) {
    return 0
  }
  const price = await getPrice(coinInfo.symbol, timestamp)
  const amount = await scaleDown(n, coinInfo.decimals)
  return amount.multipliedBy(price)
}
