import { AptosClient, CoinClient, TokenClient } from 'aptos-sdk'
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import CoinGecko from 'coingecko-api'
import { string } from "@sentio/sdk/src/builtin/aptos/0x1";

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
        decimals: 1,
        supply: {vec:""}
      }
    }
    coinInfos.set(type, info)
  }
  return info
}

export function scaleDown(n: bigint, decimal: number) {
  // return n
  return new BigDecimal(n.toString()).div(new BigDecimal(10).pow(decimal))
}


export function getPrice(x: string, y: string) {
  CoinGeckoClient.simple.price({
    ids: [x, y],
    vs_currencies: ['apt'],
  })
}

