import { SuiContext } from "@sentio/sdk/sui"

export function getCollectionName(type: string) {
    let collectionName = ""
    const index = type.lastIndexOf(':')
    collectionName = type.slice(index + 1)
    return collectionName
}

export async function getNftName(ctx: SuiContext, nft: string) {
    let NFTName = ""
    let type = ""
    let link = ""
    try {
        const obj = await ctx.client.getObject({ objectId: nft, include: {
                json: true
        } })
        // @ts-ignore
        NFTName = obj.object?.json?.name
        // @ts-ignore
        link = obj.object?.json?.link || obj.object?.json?.url || obj.object?.json?.image_url
        type = obj.object?.type || ""
    }
    catch (e) { console.log(`${e.message}, getNftName error at ${ctx.transaction.digest}`) }
    return [NFTName, type, link]
}