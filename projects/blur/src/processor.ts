import { SeaportProcessor } from "./types/eth/seaport.js";
import { getERC721Contract } from "@sentio/sdk/eth/builtin/erc721";

export const SEAPORT_ADDRESS = "0x00000000006c3852cbEf3e08E8dF289169EdE581"
export const FILL_SOURCE_LOOKUP = new Map<string, string>([
  ['2d1229', 'Blur'],
  ['000000', 'Blur'],
  ['0c6ebe', 'Opensea'],
  ['a9c101', 'Opensea'],
  ['db8c0b', 'Opensea'],
  ['68cfd5', 'Opensea'],
  ['db8c0b', 'Opensea'],
  ['9c1cb7', 'Opensea'],
  ['e27964', 'Opensea'],
  ['a3aa28', 'Opensea'],
  ['4ff553', 'Opensea'],
  ['7560b1', 'Opensea'],
  ['61691f', 'Opensea'],
  ['6f6d1f', 'Opensea'],
  ['d24601', 'Opensea'],
  ['8fb141', 'Opensea'],
  ['d24601', 'Opensea'],
  ['d0ccf0', 'Opensea'],
  ['0a57de', 'Opensea'],
  ['947c2d', 'Opensea'],
  ['617461', 'Opensea'],
  ['2e16d7', 'Opensea'],
  ['6d93db', 'Opensea'],
  ['14e8a3', 'Reservoir'],
  ['54e411', 'Reservoir'],
  ['7e4c66', 'Reservoir'],
  ['4a730c', 'Reservoir']
])


function getFillSource(inputDataSuffix: string) {
  let source = FILL_SOURCE_LOOKUP.get(inputDataSuffix)
  if (!source) {
    source = inputDataSuffix
  }
  return source
}
// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()

async function getCollectionName(nftAddress: string) {
  let collectionName = nftCollectionMap.get(nftAddress)
  if (!collectionName) {
    try {
      collectionName = await getERC721Contract(nftAddress).name()!
      nftCollectionMap.set(nftAddress, collectionName)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " retrieve nft collection name failed")
      }
    }
  }
  return collectionName
}

SeaportProcessor.bind({ address: SEAPORT_ADDRESS, startBlock: 16731645, endBlock: 16731645 })
  .onEventOrderFulfilled(async (event, ctx) => {
    ctx.meter.Counter("OrderFilled_Counter").add(1)

    const offerer = event.args.offerer
    const recipient = event.args.recipient
    const zone = event.args.zone
    const offer = event.args.offer
    const consideration = event.args.consideration

    //retrieve offer[0] info
    const nftAddress = offer[0].token
    const nftCollection = await getCollectionName(nftAddress)
    const nftType = Number(offer[0].itemType)
    const nftId = Number(offer[0].identifier)
    const nftAmount = Number(offer[0].amount)
    console.log("nftAddress, Type, Id, Amount, Collection: ", nftAddress, " ", nftType, " ", nftId, " ", nftAmount, " ", nftCollection)

    //retrieve consideration info
    let value = 0
    for (let i = 0; i < consideration.length; i++) {
      if ((Number(consideration[i].itemType) == 0) && (consideration[i].token == "0x0000000000000000000000000000000000000000")) {
        value += Number(consideration[i].amount) / Math.pow(10, 18)
      }
    }
    console.log("consideration value: ", value)

    //get fill source from last 6 bits of input data 
    const hash = event.transactionHash
    let fillSource = ""
    let inputDataSuffix = ""
    try {
      const tx = (await ctx.contract.provider.getTransaction(hash))!
      inputDataSuffix = tx.data.toString().slice(-6)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " retrieve transaction data failed")
      }
    }
    fillSource = getFillSource(inputDataSuffix)


    //if (!FILL_SOURCE_LOOKUP.get(inputDataSuffix)) console.log("txHash: " + hash + " fillSource: " + fillSource)

    //debug log amount !=1
    //if (nftAmount != 1) console.log("txHash: " + hash + " amount " + nftAmount)



    //event
    ctx.eventLogger.emit("OrderFilled_Event",
      {
        distinctId: recipient,
        offerer: offerer,
        fillSource: fillSource,
        zone: zone,
        nftAddress: nftAddress,
        nftCollection: nftCollection,
        nftType: nftType,
        nftId: nftId,
        nftAmount: nftAmount,
        value: value,
        message: " NFT Collection: " + nftCollection + " Id:" + nftId + " Value: " + value + " ETH" + " Fill Source: " + fillSource + "OTHER_INTERNAL_HTTP_REQUEST_LOGS" + " Recipient: " + recipient + " Offerer: " + offerer
      })

  })