import { EbisusbayProcessor } from './types/ebisusbay'
import { AccountEventTracker, Counter, Gauge } from "@sentio/sdk";
import { getPriceBySymbol } from "@sentio/sdk/lib/utils/price"


const accountTracker = AccountEventTracker.register("users")

const vol = Gauge.register("vol")
const vol_cro = Gauge.register("vol_cro")


EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25 })
    .onEventSold(async (event, ctx) => {
        const listingId = event.args.listingId.toNumber()
        console.log("listingId", listingId)

        const getListing = await ctx.contract.activeListing(listingId)

        console.log("getListing", getListing)

        const amount = Number(getListing.price.toBigInt()) / Math.pow(10, 18)
        console.log("amount", amount)

        const purchaser = getListing.purchaser
        const nftId = getListing.nftId
        const seller = getListing.seller
        const nft = getListing.nft
        const fee = getListing.fee
        const is1155 = getListing.is1155
        const listingTime = getListing.listingTime
        const saleTime = getListing.saleTime
        const endingTime = getListing.endingTime
        const royalty = getListing.royalty
        console.log("purchaser: ", purchaser)
        console.log("nftId: ", nftId)
        console.log("seller: ", seller)
        console.log("nft: ", nft)
        console.log("fee: ", fee)
        console.log("is1155: ", is1155)
        console.log("listingTime: ", listingTime)
        console.log("saleTime: ", saleTime)
        console.log("endingTime: ", endingTime)
        console.log("royalty: ", royalty)

        ctx.meter.Counter('sold').add(1)

        const TokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        const priceUSD = TokenPrice * amount
        vol.record(ctx, priceUSD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nft: nft, fee: fee.toString(), is1155: is1155.toString(), listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        vol_cro.record(ctx, amount, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nft: nft, fee: fee.toString(), is1155: is1155.toString(), listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        accountTracker.trackEvent(ctx, { distinctId: from })
    })