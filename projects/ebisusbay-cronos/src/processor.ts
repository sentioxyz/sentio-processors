import { PortProcessor } from './types/eth/port.js'
import { MembershipStakerV3Processor } from './types/eth/membershipstakerv3.js'
import { TradeshipProcessor } from './types/eth/tradeship.js'
import { OfferContractProcessor } from './types/eth/offercontract.js'
import { getERC721Contract } from '@sentio/sdk/eth/builtin/erc721'
import { getERC1155Contract } from '@sentio/sdk/eth/builtin/erc1155'
import { CHAIN_IDS, Counter, Gauge } from "@sentio/sdk"
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

// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()


async function getERC721Name(nftAddress: string, txHash: string) {
    if (nftAddress.toLowerCase() == "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85") {
        console.log(" ENS")
        return "ENS"
    }

    let collectionName = nftCollectionMap.get(nftAddress)
    if (!collectionName) {
        try {
            collectionName = await getERC721Contract(CHAIN_IDS.CRONOS, nftAddress).name()!
            nftCollectionMap.set(nftAddress, collectionName)
            console.log("Set ERC721 collection name: ", collectionName)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message, " retrieve 721 nft collection name failed. txHash: ", txHash, " nftAddress", nftAddress)
                return "unknown_collection"
            }
        }
    }
    return collectionName
}

async function getERC1155Name(nftAddress: string, txHash: string) {
    let collectionName = nftCollectionMap.get(nftAddress)
    if (!collectionName) {
        try {
            //Only handles collection with name() function
            const collectionName = await getERC721Contract(CHAIN_IDS.CRONOS, nftAddress).name()!
            nftCollectionMap.set(nftAddress, collectionName)
            console.log("Set ERC1155 collection name: ", collectionName)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message, " retrieve 1155 nft collection name failed. txHash: ", txHash, " nftAddress ", nftAddress)
                collectionName = "ERC1155_" + nftAddress
                nftCollectionMap.set(nftAddress, collectionName)
                console.log("Set ERC1155 collection name: ", collectionName)
            }
        }
    }
    return collectionName
}


async function getNameByERCType(type: string, nftAddress: string, txHash: string) {
    let collectionName = ""
    if (type == "ERC1155") {
        collectionName = (await getERC1155Name(nftAddress, txHash))!
    }
    else {
        collectionName = (await getERC721Name(nftAddress, txHash))!
    }

    return collectionName
}




//first tx block time 6220924
PortProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25 })
    .onEventSold(async (event, ctx) => {
        ctx.meter.Counter('sold').add(1)
        const hash = event.transactionHash

        const listingId = Number(event.args.listingId)
        const getListing = await ctx.contract.completeListing(listingId)
        const amount = Number(getListing.price) / Math.pow(10, 18)
        const purchaser = getListing.purchaser
        const nftId = Number(getListing.nftId)
        const seller = getListing.seller
        const nftAddress = getListing.nft
        const fee = Number(getListing.fee) / Math.pow(10, 18)
        const type = getListing.is1155 ? "ERC1155" : "ERC721"
        const collectionName = await getNameByERCType(type, nftAddress, hash)
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
        ctx.eventLogger.emit("Sold_Event", {
            distinctId: purchaser,
            // priceUSD: priceUSD,
            price_CRO: amount,
            nftId: nftId.toString(),
            seller: seller,
            nftAddress: nftAddress,
            collectionName: collectionName,
            fee: fee,
            nftTokenStandard: type,
            listingTime: listingTime,
            saleTime: saleTime,
            endingTime: endingTime,
            message: `sold nft collection ${collectionName} token id ${nftId} from ${seller} to ${purchaser}, for the price of ${amount} CRO, fee of ${fee} CRO`
        })

        //check purchaser and from
        console.log("sold tx hash:", hash)
        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from

            if (purchaser !== from)
                console.log("false debug log:", purchaser, " and ", from)
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }


    })
    .onEventRoyaltyPaid(async (event, ctx) => {
        ctx.meter.Counter("RoyaltyPaid").add(1)
        const hash = event.transactionHash

        const nftAddress = event.args.collection
        const nftId = event.args.id
        const royalty = Number(event.args.amount) / Math.pow(10, 18)
        const collectionName = (await getERC1155Name(nftAddress, hash))!

        // const tokenPrice = await getPriceBySymbol("CRO", ctx.timestamp)
        // const priceUSD = tokenPrice * amount
        // const royalty_USD = royalty * tokenPrice

        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit("RoyaltyPaid_Event", {
                distinctId: from,
                royalty: royalty,
                nftId: nftId.toString(),
                nftAddress: nftAddress,
                collectionName: collectionName,
                message: `royalty paid ${collectionName} token id ${nftId} from ${from}, with royalty amount ${royalty} CRO`
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
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit(event.name,
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
MembershipStakerV3Processor.bind({ address: '0xeb074cc764F20d8fE4317ab63f45A85bcE2bEcB1', network: 25 })
    .onEventRyoshiStaked(async (event, ctx) => {
        const owner = event.args.owner
        const tokenId = event.args.tokenId.toString()

        stakeGauge.record(ctx, 1)
        stakeCounter.add(ctx, 1)
        ctx.eventLogger.emit("RyoshiStaked_Event", {
            distinctId: owner,
            tokenId: tokenId,
            message: `royalty staked for token id ${tokenId} from ${owner}`
        })

        //check owner and from
        const hash = event.transactionHash
        // console.log("stake tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            // console.log("stake tx hash:", hash)

            const from = tx.from

            if (owner != from)
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
            tokenId: tokenId,
            message: `ryoshiunstaked for token id ${tokenId} from ${owner}`
        })

        //check owner and from
        const hash = event.transactionHash
        // console.log("unstake tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            const from = tx.from

            if (owner != from)
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
        const to = event.args.arg0

        rewardCounter_CRO.add(ctx, reward)
        rewardGauge_CRO.record(ctx, reward)
        // rewardCounter_USD.add(ctx, reward_USD)
        // rewardGauge_USD.record(ctx, reward_USD)

        const hash = event.transactionHash

        ctx.eventLogger.emit("Harvest_Event", {
            distinctId: to,
            reward: reward,
            message: `reward ${reward} CRO to ${to}`
        })

        //check owner and from
        // console.log("harvest tx hash:", hash)
        try {
            const tx = (await ctx.contract.provider.getTransaction(hash))!
            console.log("harvest tx", tx, "harvest tx hash:", hash)

            const from = tx.from

            if (to != from)
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
        let stakeBalance
        try {
            stakeBalance = Number(await ctx.contract.totalStaked())
            console.log(`stakeBalance success, ${stakeBalance}. tx ${hash}`)

            ctx.meter.Gauge("totalStaked").record(stakeBalance)
        } catch (e) {
            if (e instanceof Error) {
                console.log(`stakeBalance failed, tx: ${hash} `, e.message)
            }
        }

        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit(event.name,
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
TradeshipProcessor.bind({ address: '0x523d6f30c4aaca133daad97ee2a0c48235bff137', network: 25 })
    .onEventOrderFilled(async (event, ctx) => {
        ctx.meter.Counter("order_filled").add(1)
        const hash = event.transactionHash
        const royalty = Number(event.args.royaltyAmount) / Math.pow(10, 18)
        console.log("orderFilled txHash", hash)
        const tx = (await ctx.contract.provider.getTransaction(hash))!
        const from = tx.from

        //decode input data
        const decodedRawData = ctx.contract.rawContract.interface.parseTransaction({ data: tx.data })
        const decodedRawDataObj = JSON.parse(JSON.stringify(decodedRawData?.args[0]))
        // console.log("obj[0][0]:", obj[0][0], " array[0][1][0]:", obj[0][1][0])
        for (var i = 0; i < decodedRawDataObj.length; i++) {
            const seller = decodedRawDataObj[i][0]
            const nftAddress = decodedRawDataObj[i][1][0][1]
            const nftId = decodedRawDataObj[i][1][0][2]
            const amount = Number(decodedRawDataObj[i][2][0][3]) / Math.pow(10, 18)
            const collectionName = (await getERC1155Name(nftAddress, hash))!

            // console.log("seller:", seller, " nftAddress: ", nftAddress, " nftId:", nftId, " amount:", amount)

            //catch empty from
            try {
                ctx.eventLogger.emit("Order_Filled_Event",
                    {
                        distinctId: from,
                        amount: amount,
                        seller: seller,
                        nftAddress: nftAddress,
                        collectionName: collectionName,
                        nftId: nftId.toString(),
                        message: `orderfilled nft collection ${collectionName} token id ${nftId} from ${seller} to ${from}, for the price of ${amount} CRO`
                    })
            }
            catch (e) {
                if (e instanceof Error) {
                    console.log(e.message)
                }
            }
        }


    })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit(event.name,
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
OfferContractProcessor.bind({ address: '0x016b347aeb70cc45e3bbaf324feb3c7c464e18b0', network: 25 })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash
        try {
            var tx = (await ctx.contract.provider.getTransaction(hash))!
            var from = tx.from
            ctx.eventLogger.emit(event.name,
                {
                    distinctId: from
                })
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message)
            }
        }
    })


