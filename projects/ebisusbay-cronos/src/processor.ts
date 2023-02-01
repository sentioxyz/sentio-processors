import { EbisusbayProcessor } from './types/ebisusbay'
import { MembershipStakerV3Processor } from './types/membershipstakerv3'


import { AccountEventTracker, Counter, Gauge } from "@sentio/sdk";
import { getPriceBySymbol } from "@sentio/sdk/lib/utils/price"


const accountTracker = AccountEventTracker.register("users")

const vol = Gauge.register("vol")
const vol_CRO = Gauge.register("vol_CRO")
const volCounter_CRO = Counter.register("volCounter_CRO")

const royaltyGauge = Gauge.register("royaltyFee_CRO")
const royaltyCounter_CRO = Counter.register("royaltyFeeCounter_CRO")



EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25 })
    .onEventSold(async (event, ctx) => {
        const listingId = event.args.listingId.toNumber()
        // console.log("listingId", listingId)
        const getListing = await ctx.contract.completeListing(listingId)
        //console.log("transaction", event.transactionHash, "getListing", getListing)
        const amount = Number(getListing.price.toBigInt()) / Math.pow(10, 18)
        // console.log("amount", amount)


        const purchaser = getListing.purchaser
        const nftId = Number(getListing.nftId)
        const seller = getListing.seller
        const nft = getListing.nft
        const fee = Number(getListing.fee) / Math.pow(10, 18)
        const type = getListing.is1155 ? "ERC1155" : "ERC721"
        const listingTime = getListing.listingTime
        const saleTime = getListing.saleTime
        const endingTime = getListing.endingTime
        const royalty = Number(getListing.royalty) / Math.pow(10, 18)
        // console.log("purchaser: ", purchaser)
        // console.log("nftId: ", nftId)
        // console.log("seller: ", seller)
        // console.log("nft: ", nft)
        // console.log("fee: ", fee)
        // console.log("is1155: ", getListing.is1155, "type:", type)
        // console.log("listingTime: ", listingTime)
        // console.log("saleTime: ", saleTime)
        // console.log("endingTime: ", endingTime)
        // console.log("royalty: ", royalty)

        ctx.meter.Counter('sold').add(1)

        //const TokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        //const priceUSD = TokenPrice * amount

        royaltyGauge.record(ctx, royalty, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        royaltyCounter_CRO.add(ctx, royalty, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        //vol.record(ctx, priceUSD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        vol_CRO.record(ctx, amount, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        volCounter_CRO.add(ctx, amount, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        accountTracker.trackEvent(ctx, { distinctId: from })
    })


const stakeGauge = Gauge.register("stake")
const stakeCounter = Counter.register("stakeCounter")
const rewardCounter = Counter.register("stakeRewardCounter")

MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25 })
    .onEventRyoshiStaked(async (event, ctx) => {
        stakeGauge.record(ctx, 1)
        stakeCounter.add(ctx, 1)

    })
    .onEventRyoshiUnstaked(async (event, ctx) => {
        stakeGauge.record(ctx, 1)
        stakeCounter.sub(ctx, 1)

    })
    .onEventHarvest(async (event, ctx) => {
        rewardCounter.add(ctx, Number(event.args.amount) / Math.pow(10, 18), { to: event.args.arg0 })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        accountTracker.trackEvent(ctx, { distinctId: from })
    })