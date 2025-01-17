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
        const obj = await ctx.client.getObject({ id: nft, options: {
                showType: true,
                showContent: true
        } })
        // @ts-ignore
        NFTName = obj.data?.content?.fields.name
        // @ts-ignore
        link = obj.data?.content?.fields.link || obj.data?.content?.fields.url || obj.data?.content?.fields.image_url
        type = obj.data?.type || ""
    }
    catch (e) { console.log(`${e.message}, getNftName error at ${ctx.transaction.digest}`) }
    return [NFTName, type, link]
}