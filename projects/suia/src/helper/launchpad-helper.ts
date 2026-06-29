import { SuiContext } from "@sentio/sdk/sui"
export async function getPoolMetadata(ctx: SuiContext, pool: string) {
    let [softcap, hardcap, reality_raise_total, sale_total] = [0, 0, 0, 0]

    const obj = (await ctx.client.getObject({ objectId: pool, include: { json: true } })).object
    const f = obj.json as any
    softcap = Number(f?.softcap)
    hardcap = Number(f?.hardcap)
    reality_raise_total = Number(f?.reality_raise_total)
    sale_total = Number(f?.sale_total)
    return {
        softcap,
        hardcap,
        reality_raise_total,
        sale_total
    }
}
