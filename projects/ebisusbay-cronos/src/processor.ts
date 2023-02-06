import { EbisusbayProcessor } from './types/ebisusbay/index.js'
import { MembershipStakerV3Processor } from './types/membershipstakerv3/index.js'
import { Counter, Gauge } from "@sentio/sdk"
import { getPriceBySymbol } from "@sentio/sdk/utils"


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

const royaltyCounter1000Test_CRO = Counter.register("royalty_test_1000")

//first tx block time 6220924
EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25, startBlock: 6216653 })
<<<<<<< HEAD
    .onEventSold(async (event, ctx) => {
        ctx.meter.Counter('sold').add(1)

        const listingId = Number(event.args.listingId)
        const getListing = await ctx.contract.completeListing(listingId)
        const amount = Number(getListing.price) / Math.pow(10, 18)

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
        const labels = { fee: fee.toString(), nftTokenStandard: type }
        royaltyGauge_CRO.record(ctx, royalty, labels)
        royaltyCounter_CRO.add(ctx, royalty, labels)
        royaltyGauge_USD.record(ctx, royalty_USD, labels)
        royaltyCounter_USD.add(ctx, royalty_USD, labels)

        royaltyCounter1000Test_CRO.add(ctx, royalty * 1000, labels)

        vol_USD.record(ctx, priceUSD, labels)
        vol_CRO.record(ctx, amount, labels)
        volCounter_CRO.add(ctx, amount, labels)
        volCounter_USD.add(ctx, priceUSD, labels)

        //event analysis
        const hash = event.transactionHash
        const randomNumber = Math.floor(Math.random() * 10000000000)

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
            txHash: hash,
            randomNumber: randomNumber
        })
    })
=======
>>>>>>> e57df63 (debug cronos)
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash

        let tx
        let cnt = 0
        while (!tx && cnt < 10){
        try {
            tx = await ctx.contract.provider.getTransaction(hash)
        } catch (e) {
            console.log("err get txn",e)
            return
        }
        console.log("no tx:", hash, cnt)
            cnt++
        }
        if (!tx) {
            console.log("no tx after retry:", hash)
            return
        }
        console.log("transaction", tx)
        let from = tx.from
        ctx.eventTracker.track("Any_Event",
                {
                    distinctId: from
                })
<<<<<<< HEAD
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })



//first tx block time 2084066
MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25, startBlock: 6216653 })
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

        stakeGauge.record(ctx, 1)
        stakeCounter.sub(ctx, 1)
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

        const hash = event.transactionHash
        const randomNumber = Math.floor(Math.random() * 10000000000)

        ctx.eventTracker.track("Harvest_Event", {
            distinctId: to,
            reward: reward,
            reward_USD: reward_USD,
            txHash: hash,
            randomNumber: randomNumber
        })
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            console.log("transactionHash", hash)
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            console.log("transactionHash", hash, "tx:", tx)

            ctx.eventTracker.track("Any_Event",
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
=======
>>>>>>> e57df63 (debug cronos)
    })