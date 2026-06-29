import { SuiContext } from "@sentio/sdk/sui"
export async function getIDOPoolMetadata(ctx: SuiContext, pool: string) {
    let [softcap, hardcap, reality_raise_total, sale_total] = [0, 0, 0, 0]
    try {
        const obj = await ctx.client.getObject({ objectId: pool, include: { json: true } })
        //@ts-ignore
        softcap = Number(obj.object.json?.softcap)
        //@ts-ignore
        hardcap = Number(obj.object.json?.hardcap)
        //@ts-ignore
        reality_raise_total = Number(obj.object.json?.reality_raise_total)
        //@ts-ignore
        sale_total = Number(obj.object.json?.sale_total)
    }
    catch (e) {
        console.log(`${e.message} get ido pool object metadataError at ${pool}`)
    }
    return {
        softcap,
        hardcap,
        reality_raise_total,
        sale_total
    }
}