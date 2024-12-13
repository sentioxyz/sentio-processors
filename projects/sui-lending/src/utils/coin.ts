import { SuiContext, SuiNetwork } from '@sentio/sdk/sui'
import { CoinMetadata } from '@mysten/sui.js/client'
import { normalizeSuiAddress } from '@mysten/sui.js/utils'

const coinsMetadata = new Map<string, CoinMetadata | null>()

export async function getCoinMetadata(ctx: SuiContext, coinType: string) {
  if (!coinType.startsWith('0x')) {
    coinType = '0x' + coinType
  }
  // coinType = normalizeSuiAddress(coinType)
  let metadata = coinsMetadata.get(coinType)
  if (metadata === undefined) {
    try {
      const data = await ctx.client.getCoinMetadata({ coinType })
      if (data) {
        metadata = data
        coinsMetadata.set(coinType, metadata)
      }
    } catch (e) {
      console.warn('getCoinMetadata failed with', e.message)
      coinsMetadata.set(coinType, null)
    }
  }
  return metadata
}
