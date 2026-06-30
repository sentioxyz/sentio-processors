import { SuiObjectTypeProcessor } from '@sentio/sdk/sui'
import { coin } from "@sentio/sdk/sui/builtin/0x2";
import { parseMoveType } from '@sentio/sdk/move';
import { Metadata } from "./schema/store.js";

let native = false

SuiObjectTypeProcessor.bind({
  objectType: coin.CoinMetadata.type()
}).onObjectChange(async (changes, ctx) => {
  for (const change of changes) {
    if (native == false) {
      console.log("insert native token")
      await ctx.store.upsert(new Metadata({
        id: '0x2::sui::SUI',
        coin_type: '0x2::sui::SUI',
        name: 'SUI',
        symbol: 'SUI',
        decimals: 9,
        description: 'native SUI token',
        icon_url: undefined,
        digest: ctx.txDigest,
        timestamp: new Date(0)
      }))
      native = true
    }

    if (change.idOperation !== 'Created') {
      continue
    }
    try {
      // Version-pinned ("past") read: onObjectChange reacts to a historical change,
      // and the object may be gone at the latest version (deleted/wrapped) — which is
      // why latest getObject throws "not found". Read it at change.outputVersion to
      // get it as it was. We only need the object type (to derive the coin type), so
      // request just object_type. Fall back to latest if the node pruned that version.
      let objType: string | undefined
      try {
        const past = await ctx.client.ledgerService.getObject({
          objectId: change.objectId,
          version: change.outputVersion ? BigInt(change.outputVersion) : undefined,
          readMask: { paths: ['object_type'] }
        })
        objType = past.response.object?.objectType
      } catch {
        // historical version unavailable (pruned) — fall through to latest
      }
      if (!objType) {
        objType = (await ctx.client.getObject({ objectId: change.objectId, include: { json: true } })).object.type
      }
      const t = parseMoveType(objType)
      const coinType = t.typeArgs[0].getSignature()

      const metadata = (await ctx.client.getCoinMetadata({ coinType })).coinMetadata
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
            timestamp: ctx.timestamp
          }))
        }
      } else {
        console.error(`Failed to fetch metadata for coin type: ${coinType}`)
      }
    } catch (e) {
      // SDK 4's gRPC getObject/getCoinMetadata throw when the object/coin is not
      // found (e.g. already deleted or wrapped). SDK 3's JSON-RPC returned an empty
      // result, so the old processor silently skipped it — preserve that behavior.
      console.log(`skip object change ${change.objectId}: ${e.message}`)
    }
  }
})