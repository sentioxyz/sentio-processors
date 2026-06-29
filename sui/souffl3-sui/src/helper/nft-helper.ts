import { SuiContext } from "@sentio/sdk/sui"

export function getCollectionName(type: string) {
    let collectionName = ""
    const index = type.lastIndexOf(':')
    collectionName = type.slice(index + 1)
    return collectionName
}


export async function getNftName(ctx: SuiContext, nft: string) {
    let NFTName = "unk"
    try {
        const obj = await ctx.client.getObject({ objectId: nft, include: { json: true } })
        NFTName = (obj.object.json as any)?.name
    }
    catch (e: any) { console.log(`${e.message}, getNftName error at ${ctx.transaction.digest}`) }
    return NFTName
}


export async function getNftAndCollectionName(ctx: SuiContext, nft: string) {
    let [NFTName, collectionName] = ["unk", "unk"]
    try {
        const obj = await ctx.client.getObject({ objectId: nft, include: { json: true } })
        NFTName = (obj.object.json as any)?.name
        const type = obj.object.type
        console.log(NFTName, " ", type)
        collectionName = getCollectionName(type).slice(0, -1)
    }
    catch (e: any) { console.log(`${e.message}, getNftName error at ${ctx.transaction.digest}`) }
    return [NFTName, collectionName]
}
