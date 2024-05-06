import { AptosCoinList } from '@sentio/sdk/aptos/ext'

export const startVersion = 70250898

export async function getPair(coinX: string, coinY: string, curve: string): Promise<string> {
  const coinXInfo = await AptosCoinList.getCoinInfo(coinX)
  const coinYInfo = await AptosCoinList.getCoinInfo(coinY)
  const curveType = curve.split('::')[2]
  if (coinXInfo.symbol.localeCompare(coinYInfo.symbol) > 0) {
    return `${coinYInfo.symbol}-${coinXInfo.symbol}-${curveType}`
  }
  return `${coinXInfo.symbol}-${coinYInfo.symbol}-${curveType}`
}
