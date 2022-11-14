import fetch from 'node-fetch';
import { DEFAULT_MAINNET_LIST, RawCoinInfo } from "@manahippo/coin-list/dist/list";
import { AptosClient } from "aptos-sdk";
import { aptos, BigDecimal } from "@sentio/sdk";
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;
import { getRandomInt } from "../utils";

const client = new AptosClient("https://aptos-mainnet.nodereal.io/v1/0c58c879d41e4eab8fd2fc0406848c2b/")

interface BaseCoinInfoWithBridge extends RawCoinInfo {
  bridge: string
}

interface SimpleCoinInfo {
  token_type: {  type: string }
  symbol: string
  decimals: number
  bridge: string
}

export const CORE_TOKENS = new Map<string, BaseCoinInfoWithBridge>()

for (const info of DEFAULT_MAINNET_LIST) {
  let bridge = "native"
  if (info.name.includes("Celer")) {
    bridge = "Celer"
  }
  if (info.name.includes("LayerZero")) {
    bridge = "LayerZero"
  }
  if (info.name.includes("Wormhole")) {
    bridge = "Wormhole"
  }
  if (!info.coingecko_id) {
    if (info.symbol.endsWith("APT")) {
      info.coingecko_id = "aptos"
    }
    if (info.symbol.startsWith("USD")) {
      info.coingecko_id = "usd-coin"
    }
    // TODO add moji
  }
  CORE_TOKENS.set(info.token_type.type, { ...info, bridge })
}

export function whiteListed(type: string): boolean {
  return CORE_TOKENS.has(type)
}

export function getCoinInfo(type: string): SimpleCoinInfo {
  const r = CORE_TOKENS.get(type)
  if (!r) {
    return {
      token_type: { type: type },
      symbol: type.split("::")[2],
      decimals: 1,
      bridge: "native"
    }
  }
  return r
}

export function scaleDown(n: bigint, decimal: number) {
  return new BigDecimal(n.toString()).div(new BigDecimal(10).pow(decimal))
}

const priceCache = new Map<string, number>()
const lastPriceCache = new Map<string, number>()

export async function getPrice(coinType: string, timestamp: number) {
  if (!whiteListed(coinType)) {
    return 0.0
  }

  const id = CORE_TOKENS.get(coinType)?.coingecko_id
  if (!id) {
    if (coinType === '0x881ac202b1f1e6ad4efcff7a1d0579411533f2502417a19211cfc49751ddb5f4::coin::MOJO') {
      return 0.01618810
    }
    if (coinType === '0x5c738a5dfa343bee927c39ebe85b0ceb95fdb5ee5b323c95559614f5a77c47cf::Aptoge::Aptoge') {
      return 0.271427
    }

    throw Error("can't find coin id" + coinType)
  }

  const date = new Date(timestamp / 1000)
  return getPriceByDate(coinType, id, date)
}

export async function getPriceByDate(coinType: string, id: string, date: Date): Promise<number> {
  const dateStr =  [date.getUTCDate(), date.getUTCMonth()+1, date.getUTCFullYear()].join("-")

  const cacheKey = id + dateStr
  let price = priceCache.get(cacheKey)
  if (price) {
    return price
  }
  let res: any
  while(true) {
    try {
      const requestUrl = `http://coingecko-proxy-server.chain-sync:8647/api/v3/coins/${id}/history?date=${dateStr}&localization=false&x_cg_pro_api_key=CG-NayGdpa2CqG1jp5CLtcA4kVp`
      const response = await fetch(requestUrl)

      res = await response.json()
    } catch (e) {
      await delay(1000)
      continue
    }
    break
  }
  if (!res || !res.market_data || !res.market_data.current_price || !res.market_data.current_price.usd) {
    console.error("no price data for ", coinType, id, dateStr)
    price = lastPriceCache.get(id) || 0
    if (!price) {
      const previousDate = new Date()
      previousDate.setDate(date.getDate() - 1);
      price = await getPriceByDate(coinType, id, previousDate)
      // console.error("can't even found last price", id, dateStr)
    }
  } else {
    price = res.market_data.current_price.usd as number
  }

  priceCache.set(cacheKey, price)
  lastPriceCache.set(id, price)
  return price
}

export async function calculateValueInUsd(n: bigint, coinInfo: SimpleCoinInfo, timestamp: number | string) {
  if (typeof timestamp === 'string') {
    timestamp = parseInt(timestamp)
  }
  const price = await getPrice(coinInfo.token_type.type, timestamp)
  const amount = await scaleDown(n, coinInfo.decimals)
  return amount.multipliedBy(price)
}

export function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}