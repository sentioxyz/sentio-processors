import { PortProcessor } from './types/eth/port.js'
import { MembershipStakerV3Processor } from './types/eth/membershipstakerv3.js'
import { TradeshipProcessor } from './types/eth/tradeship.js'
import { OfferContractProcessor } from './types/eth/offercontract.js'

import { Counter, Gauge } from "@sentio/sdk"
// import { getPriceBySymbol } from "@sentio/sdk/utils"


// const vol_USD = Gauge.register("vol_USD")
const vol_CRO = Gauge.register("vol_CRO")
const volCounter_CRO = Counter.register("volCounter_CRO")
// const volCounter_USD = Counter.register("volCounter_USD")

const royaltyGauge_CRO = Gauge.register("royaltyFee_CRO")
const royaltyCounter_CRO = Counter.register("royaltyFeeCounter_CRO")
// const royaltyGauge_USD = Gauge.register("royaltyFee_USD")
// const royaltyCounter_USD = Counter.register("royaltyFeeCounter_USD")

const stakeGauge = Gauge.register("stake")
const stakeCounter = Counter.register("stakeCounter")

const rewardCounter_CRO = Counter.register("stakeRewardCounter_CRO")
const rewardGauge_CRO = Gauge.register("stakeReward_CRO")
// const rewardCounter_USD = Counter.register("stakeRewardCounter_USD")
// const rewardGauge_USD = Gauge.register("stakeReward_USD")


//first tx block time 6220924
PortProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25, startBlock: 6288500, endBlock: 6688655 })
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


        // counter and gauge
        const labels = { nftTokenStandard: type }

        // vol_USD.record(ctx, priceUSD, labels)
        vol_CRO.record(ctx, amount, labels)
        volCounter_CRO.add(ctx, amount, labels)
        // volCounter_USD.add(ctx, priceUSD, labels)

        //event analysis
        const hash = event.transactionHash
        ctx.eventLogger.emit("Sold_Event", {
            distinctId: purchaser,
            // priceUSD: priceUSD,
            price_CRO: amount,
            nftId: nftId,
            seller: seller,
            nftAddress: nft,
            fee: fee.toString(),
            nftTokenStandard: type,
            listingTime: listingTime,
            saleTime: saleTime,
            endingTime: endingTime
        })

        //check purchaser and from
        console.log("sold tx hash:", hash)
        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from

            if (purchaser == from)
                console.log("true sold event check:", purchaser)
            else
                console.log("false sold event check:", purchaser, " and ", from)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }


    })
    .onEventRoyaltyPaid(async (event, ctx) => {
        ctx.meter.Counter("RoyaltyPaid").add(1)

        const nftAddress = event.args.collection
        const nftId = event.args.id
        const royalty = Number(event.args.amount) / Math.pow(10, 18)
        // const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        // const priceUSD = tokenPrice * amount
        // const royalty_USD = royalty * tokenPrice

        const hash = event.transactionHash
        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit("RoyaltyPaid_Event", {
                distinctId: from,
                royalty: royalty,
                nftId: nftId,
                nftAddress: nftAddress
            })
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }


    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            console.log("port txHash", hash)
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            console.log("port txHash", hash, "tx from:", from)

            ctx.eventLogger.emit("Any_Event",
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })



//first tx block time 2084066,6216653
MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25, startBlock: 6288500, endBlock: 6688655 })
    .onEventRyoshiStaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1)
        stakeCounter.add(ctx, 1)
        ctx.eventLogger.emit("RyoshiStaked_Event", {
            distinctId: owner,
            tokenId: tokenId
        })

        //check owner and from
        const hash = event.transactionHash
        console.log("stake tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            console.log("stake tx hash:", hash)

            const from = tx.from

            if (owner == from)
                console.log("true stake event check:", owner)
            else
                console.log("false stake event check:", owner, " and ", from)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }





    })
    .onEventRyoshiUnstaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1)
        stakeCounter.sub(ctx, 1)
        ctx.eventLogger.emit("RyoshiUnStaked_Event", {
            distinctId: owner,
            tokenId: tokenId
        })

        //check owner and from
        const hash = event.transactionHash
        console.log("unstake tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            const from = tx.from

            if (owner == from)
                console.log("true unstake event check:", owner)
            else
                console.log("false unstake event check:", owner, " and ", from)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }




    })
    .onEventHarvest(async (event, ctx) => {
        const reward = Number(event.args.amount) / Math.pow(10, 18)
        // const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        // const reward_USD = reward * tokenPrice
        const to = event.args[0]

        rewardCounter_CRO.add(ctx, reward)
        rewardGauge_CRO.record(ctx, reward)
        // rewardCounter_USD.add(ctx, reward_USD)
        // rewardGauge_USD.record(ctx, reward_USD)

        const hash = event.transactionHash

        ctx.eventLogger.emit("Harvest_Event", {
            distinctId: to,
            reward: reward
            // reward_USD: reward_USD,
        })

        //check owner and from
        console.log("harvest tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            console.log("harvest tx", tx, "harvest tx hash:", hash)

            const from = tx.from

            if (to == from)
                console.log("true harvest event check:", to)
            else
                console.log("false harvest event check:", to, " and ", from)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }


    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            console.log("membership v3 transactionHash", hash)
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            console.log("membership v3 transactionHash", hash, "tx from:", from)

            ctx.eventLogger.emit("Any_Event",
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })



//first tx block time 6688239
TradeshipProcessor.bind({ address: '0x523d6f30c4aaca133daad97ee2a0c48235bff137', network: 25, startBlock: 6688239, endBlock: 6688655 })
    .onEventOrderFilled(async (event, ctx) => {
        ctx.meter.Counter("order_filled").add(1)
        const hash = event.transactionHash
        const royalty = Number(event.args.royaltyAmount) / Math.pow(10, 18)
        console.log("orderFilled txHash", hash)
        const tx = (await ctx.contract.provider.getTransaction(hash))!
        const from = tx.from
        const value = Number(tx.value) / Math.pow(10, 18)

        //decode input data
        // console.log("input data: ", tx.data)

        // var decodedRawData = ctx.contract.rawContract.interface.parseTransaction({ data: tx.data })

        //method 1 


        // const arg_details: string = ""
        // for (var i = 0; i < arg0.length; i++) {
        //     arg_details.concat(" arg[0][" + i + "]=" + arg0[i])
        // }
        // console.log(arg_details)
        // const arg0Raw = decodedRawData?.args[0]
        // console.log("arg0Raw", arg0Raw)
        // const arg0object = JSON.parse(arg0Raw)
        // console.log("arg0object", arg0object)
        // console.log(arg0object[0][0], " ", arg0object[0][1][1])

        // const decodedDataArray = []
        // for (var i = 0; i < arg0Raw.length; i++) {
        //     decodedDataArray[i] = arg0Raw[0]
        //     console.log("decodedDataArray[", i, "]:", JSON.stringify(decodedDataArray[i]))
        // }


        try {

            console.log("orderFilled value:", value, "royalty:", royalty, "txhash:", hash)

            ctx.eventLogger.emit("Order_Filled_Event",
                {
                    distinctId: from,
                    value: value,
                    royalty: royalty
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            console.log("tradeship transactionHash", hash)
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            console.log("tradeship transactionHash", hash, "tx from:", from)

            ctx.eventLogger.emit("Any_Event",
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })



//first tx block time 4079464
OfferContractProcessor.bind({ address: '0x016b347aeb70cc45e3bbaf324feb3c7c464e18b0', network: 25, startBlock: 6688239, endBlock: 6688655 })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            console.log("transactionHash", hash)
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            console.log("offerContract transactionHash", hash, "tx from:", from)

            ctx.eventLogger.emit("Any_Event",
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })


