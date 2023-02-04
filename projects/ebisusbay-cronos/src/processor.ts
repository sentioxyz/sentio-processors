import { EbisusbayProcessor } from './types/ebisusbay'
import { MembershipStakerV3Processor } from './types/membershipstakerv3'


import { AccountEventTracker, EventTracker, Counter, Gauge } from "@sentio/sdk";
import { getPriceBySymbol } from "@sentio/sdk/lib/utils/price"


const accountTracker = AccountEventTracker.register("users")
const vol_USD = Gauge.register("vol_USD")
const vol_CRO = Gauge.register("vol_CRO")

const volCounter_CRO = Counter.register("volCounter_CRO")
const volCounter_USD = Counter.register("volCounter_USD")

const royaltyGauge_CRO = Gauge.register("royaltyFee_CRO")
const royaltyCounter_CRO = Counter.register("royaltyFeeCounter_CRO")
const royaltyGauge_USD = Gauge.register("royaltyFee_USD")
const royaltyCounter_USD = Counter.register("royaltyFeeCounter_USD")

const stakeGauge = Gauge.register("stake")
const stakeCounter = Counter.register("stakeCounter")

const rewardCounter_CRO = Counter.register("stakeRewardCounter_CRO")
const rewardGauge_CRO = Gauge.register("stakeReward_CRO")
const rewardCounter_USD = Counter.register("stakeRewardCounter_USD")
const rewardGauge_USD = Gauge.register("stakeReward_USD")



EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25, startBlock: 6216653 })
    .onEventSold(async (event, ctx) => {
        ctx.meter.Counter('sold').add(1)

        const listingId = event.args.listingId.toNumber()
        const getListing = await ctx.contract.completeListing(listingId)
        const amount = Number(getListing.price.toBigInt()) / Math.pow(10, 18)

        const purchaser = getListing.purchaser
        const nftId = Number(getListing.nftId).toString()
        const seller = getListing.seller
        const nft = getListing.nft
        const fee = Number(getListing.fee) / Math.pow(10, 18)
        const type = getListing.is1155 ? "ERC1155" : "ERC721"
        const listingTime = getListing.listingTime.toString()
        const saleTime = getListing.saleTime.toString()
        const endingTime = getListing.endingTime.toString()
        const royalty = Number(getListing.royalty) / Math.pow(10, 18)
        const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        const priceUSD = tokenPrice * amount
        const royalty_USD = royalty * tokenPrice


        // counter and gauge
        const labels = { nftId: nftId, seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime, saleTime: saleTime, endingTime: endingTime, royalty: royalty.toString() }
        royaltyGauge_CRO.record(ctx, royalty, labels)
        royaltyCounter_CRO.add(ctx, royalty, labels)
        royaltyGauge_USD.record(ctx, royalty_USD, labels)
        royaltyCounter_USD.add(ctx, royalty_USD, labels)

        vol_USD.record(ctx, priceUSD, labels)
        vol_CRO.record(ctx, amount, labels)
        volCounter_CRO.add(ctx, amount, labels)
        volCounter_USD.add(ctx, priceUSD, labels)

        //event analysis
        ctx.eventTracker.track("Sold_Event", {
            distinctId: purchaser,
            priceUSD: priceUSD,
            price_CRO: amount,
            royalty_CRO: royalty,
            royalty_USD: royalty_USD,
            nftId: nftId,
            seller: seller,
            nftAddress: nft,
            fee: fee.toString(),
            nftTokenStandard: type,
            listingTime: listingTime,
            saleTime: saleTime,
            endingTime: endingTime,
            royalty: royalty.toString()
        })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from

        ctx.eventTracker.track("Any_Event",
            {
                distinctId: from
            })
    })




MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25, startBlock: 2084066 })
    .onEventRyoshiStaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1)
        stakeCounter.add(ctx, 1)
        ctx.eventTracker.track("RyoshiStaked_Event", {
            distinctId: owner,
            tokenId: tokenId
        })

    })
    .onEventRyoshiUnstaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1, { owner: owner, tokenId: tokenId })
        stakeCounter.sub(ctx, 1, { owner: owner, tokenId: tokenId })
        ctx.eventTracker.track("RyoshiUnStaked_Event", {
            distinctId: owner,
            tokenId: tokenId
        })
    })
    .onEventHarvest(async (event, ctx) => {
        const reward = Number(event.args.amount) / Math.pow(10, 18)
        const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        const reward_USD = reward * tokenPrice
        const to = event.args[0]

        rewardCounter_CRO.add(ctx, reward)
        rewardGauge_CRO.record(ctx, reward)
        rewardCounter_USD.add(ctx, reward_USD)
        rewardGauge_USD.record(ctx, reward_USD)

        ctx.eventTracker.track("Harvest_Event", {
            distinctId: to,
            reward: reward,
            reward_USD: reward_USD
        })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        event
        //accountTracker.trackEvent(ctx, { distinctId: from })
        ctx.eventTracker.track("Any_Event",
            {
                distinctId: from
            })
    })