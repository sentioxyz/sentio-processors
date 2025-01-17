import { SuiObjectTypeProcessor } from '@sentio/sdk/sui'
import { coin } from "@sentio/sdk/sui/builtin/0x2";
import { parseMoveType } from '@sentio/sdk/move';
import { Metadata } from "./schema/store.js";

SuiObjectTypeProcessor.bind({
  objectType: coin.CoinMetadata.type()
}).onObjectChange(async (changes, ctx) => {
  for (const change of changes) {
    if (change.type !== 'created') {
      continue
    }
    const t = parseMoveType(change.objectType)
    const coinType = t.typeArgs[0].getSignature()

    const metadata = await ctx.client.getCoinMetadata({ coinType })
    if (metadata) {
      if (metadata.id) {
        await ctx.store.upsert(new Metadata({
          id: metadata.id,
          coin_type: coinType,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          description: metadata.description,
          icon_url: metadata.iconUrl || undefined,
          digest: ctx.txDigest,
          timestamp: ctx.timestamp.getTime()
        }))
      }
    } else {
      console.error(`Failed to fetch metadata for coin type: ${coinType}`)
    }
  }
})