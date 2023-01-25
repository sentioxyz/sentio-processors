import { Counter, Gauge } from '@sentio/sdk'
import { EbisusbayProcessor } from './types/ebisusbay'

const vol = Gauge.register("vol")

EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25 })
    .onEventSold(async (event, ctx) => {
        const listingId = event.args.listingId
        const getListing = await ctx.contract.activeListing(listingId)
        const price = getListing.price
        ctx.meter.Counter('sold').add(1)
        vol.record(ctx, price)
    })