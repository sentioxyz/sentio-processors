import { AptosClient } from 'aptos-sdk'
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import { aptos } from "@sentio/sdk";

export const client = new AptosClient("https://aptos-mainnet.nodereal.io/v1/0c58c879d41e4eab8fd2fc0406848c2b/")

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export async function requestCoinInfo(type: string, version?: bigint): Promise<coin.CoinInfo<any>> {
  const parts = type.split("::")
  const account = parts[0]
  while (true) {
    try {
      const resource = await client.getAccountResource(account, `0x1::coin::CoinInfo<${type}>`, { ledgerVersion: version})
      if (resource) {
        const info = await aptos.TYPE_REGISTRY.decodeResource<coin.CoinInfo<any>>(resource)
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
      if (e.status === 429) {
        // console.log("rpc error get coin info", type, e)
        await delay(1000 + getRandomInt(1000))
      } else {
        throw e
      }
    }
  }
}


export function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}