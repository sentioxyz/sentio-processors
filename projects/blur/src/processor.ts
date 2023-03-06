import { SeaportProcessor, SeaportContext } from "./types/eth/seaport.js";
import { getERC721Contract } from "@sentio/sdk/eth/builtin/erc721";
import * as constant from "./constant.js"
// import { ethers } from "ethers";



function getFillSource(inputDataSuffix: string) {
  let source = constant.FILL_SOURCE_LOOKUP.get(inputDataSuffix)
  if (!source) {
    source = inputDataSuffix
  }
  return source
}
// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()

async function getERC721Name(nftAddress: string, block: number, hash_debug: string, itemType: number) {
  if (nftAddress == "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85") return "ENS"
  let collectionName = nftCollectionMap.get(nftAddress)
  if (!collectionName) {
    try {
      collectionName = await getERC721Contract(nftAddress).name()!
      nftCollectionMap.set(nftAddress, collectionName)
      console.log("Set collection name: ", collectionName)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " itemType: " + itemType + " retrieve nft collection name failed. txHash: ", hash_debug)
        return "unknown_collection"
      }
    }
  }
  return collectionName
}

async function getERC1155Name(nftAddress: string, id: number, block: number, hash_debug: string, itemType: number) {
  let collectionName = nftCollectionMap.get(nftAddress)
  // if (!collectionName) {
  //   try {
  //     const provider = new ethers.providers.JsonRpcProvider("<your_ethereum_node_url>");

  //     collectionName = await ctx.contract.uri(id)
  //     nftCollectionMap.set(nftAddress, collectionName)
  //     console.log("Set collection name: ", collectionName)
  //   }
  //   catch (e) {
  //     if (e instanceof Error) {
  //       console.log(e.message, " itemType: " + itemType + " retrieve nft collection name failed. txHash: ", hash_debug)
  //       return "unknown_collection"
  //     }
  //   }
  // }
  return collectionName
}

SeaportProcessor.bind({ address: constant.SEAPORT_ADDRESS, startBlock: 16731645, endBlock: 16731645 })
  .onEventOrderFulfilled(async (event, ctx) => {
    ctx.meter.Counter("OrderFilled_Counter").add(1)

    const offerer = event.args.offerer
    const recipient = event.args.recipient
    const zone = event.args.zone
    const offer = event.args.offer
    const consideration = event.args.consideration

    //retrieve offer[0] info
    const nftAddress = offer[0].token
    const block = Number(ctx.blockNumber)
    console.log("blockNumber", block)

    //debug getCollection
    const hash_debug = event.transactionHash
    let nftCollection = ""
    switch (Number(offer[0].itemType)) {
      case 2: {
        nftCollection = (await getERC721Name(nftAddress, block, hash_debug, Number(offer[0].itemType)))!
        break
      }
      case 3: {
        //getERC1155Name
        break
      }
      default: {
        console.log("can't handle the itemType")
        break
      }
    }



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