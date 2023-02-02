import { EbisusbayProcessor } from './types/ebisusbay'
import { MembershipStakerV3Processor } from './types/membershipstakerv3'


import { AccountEventTracker, Counter, Gauge } from "@sentio/sdk";
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
        const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        const priceUSD = tokenPrice * amount
        const royalty_USD = royalty * tokenPrice
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




        royaltyGauge_CRO.record(ctx, royalty, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        royaltyCounter_CRO.add(ctx, royalty, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        royaltyGauge_USD.record(ctx, royalty_USD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        royaltyCounter_USD.add(ctx, royalty_USD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })

        vol_USD.record(ctx, priceUSD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        vol_CRO.record(ctx, amount, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })

        volCounter_CRO.add(ctx, amount, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
        volCounter_USD.add(ctx, priceUSD, { purchaser: purchaser, nftId: nftId.toString(), seller: seller, nftAddress: nft, fee: fee.toString(), nftTokenStandard: type, listingTime: listingTime.toString(), saleTime: saleTime.toString(), endingTime: endingTime.toString(), royalty: royalty.toString() })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        accountTracker.trackEvent(ctx, { distinctId: from })
    })




MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25, startBlock: 2084066 })
    .onEventRyoshiStaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1, { owner: owner, tokenId: tokenId })
        stakeCounter.add(ctx, 1, { owner: owner, tokenId: tokenId })
        // console.log("RyoshiStaked--", "owner:", owner, "tokenId:", tokenId)

    })
    .onEventRyoshiUnstaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1, { owner: owner, tokenId: tokenId })
        stakeCounter.sub(ctx, 1, { owner: owner, tokenId: tokenId })
        // console.log("RyoshiUnstaked--", "owner:", owner, "tokenId:", tokenId)

    })
    .onEventHarvest(async (event, ctx) => {
        const reward = Number(event.args.amount) / Math.pow(10, 18)
        const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        const reward_USD = reward * tokenPrice
        const to = event.args[0]

        const hash = event.transactionHash

        // console.log("Harvest--", "Reward:", reward, "tokenPrice:", tokenPrice, "reward_USD", reward_USD, "to:", to, "transactionHash:", hash, "event.args:", event.args)

        rewardCounter_CRO.add(ctx, reward, { to: to })
        rewardGauge_CRO.record(ctx, reward, { to: to })
        rewardCounter_USD.add(ctx, reward_USD, { to: to })
        rewardGauge_USD.record(ctx, reward_USD, { to: to })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        const tx = await ctx.contract.provider.getTransaction(hash)
        const from = tx.from
        accountTracker.trackEvent(ctx, { distinctId: from })
        // console.log("OnAllEvent--", "transactionHash:", hash, "from:", from)

    })