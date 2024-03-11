import { SuiContext } from "@sentio/sdk/sui"

export function getCollectionName(type: string) {
    let collectionName = ""
    const index = type.lastIndexOf(':')
    collectionName = type.slice(index + 1)
    return collectionName
}


export async function getNftName(ctx: SuiContext, nft: string) {
    let NFTName = "unknown"
    try {
        const obj = await ctx.client.getObject({ id: nft, options: { showContent: true } })
        // @ts-ignore
        NFTName = obj.data?.content?.fields.name
    }
    catch (e) { console.log(`${e.message}, getNftName error at ${ctx.transaction.digest}`) }
    return NFTName
}