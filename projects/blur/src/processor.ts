import { SeaportProcessor, SeaportContext } from "./types/eth/seaport.js";
import { getERC721Contract } from "@sentio/sdk/eth/builtin/erc721";
import { BlurExchangeProcessor } from "./types/eth/blurexchange.js";

import * as constant from "./constant.js"
// import { ethers } from "ethers";
import fetch from 'node-fetch';

function getFillSource(inputDataSuffix: string) {
  let source = constant.FILL_SOURCE_LOOKUP.get(inputDataSuffix)
  if (!source) {
    source = inputDataSuffix
  }
  return source
}
// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()

async function getERC721Name(nftAddress: string, hash_debug: string) {
  if (nftAddress.toLowerCase() == "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85") {
    console.log(hash_debug, " ENS")
    return "ENS"
  }

  let collectionName = nftCollectionMap.get(nftAddress)
  if (!collectionName) {
    try {
      collectionName = await getERC721Contract(nftAddress).name()!
      nftCollectionMap.set(nftAddress, collectionName)
      console.log("Set collection name: ", collectionName)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " retrieve 721 nft collection name failed. txHash: ", hash_debug, " nftAddress", nftAddress)
        return "unknown_collection"
      }
    }
  }
  return collectionName
}

async function getERC1155Name(nftAddress: string, id: number, hash_debug: string) {
  let collectionName = nftCollectionMap.get(nftAddress)
  // TODO: getERC1155Contract
  if (!collectionName) {
    try {
      const collectionName = await getERC721Contract(nftAddress).name()!
      nftCollectionMap.set(nftAddress, collectionName)
      console.log("Set ERC721 collection name: ", collectionName)

      // const metadataURL = await getERC1155Contract(nftAddress).uri(id)!
      // let res = await fetch(metadataURL)
      // const json = await res.json() as any
      // collectionName = json.name
      // if (collectionName != null) nftCollectionMap.set(nftAddress, collectionName)
      // console.log("Set collection name: ", collectionName, " txhash ", hash_debug)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " retrieve 1155 nft collection name failed. txHash: ", hash_debug, " nftAddress ", nftAddress, " id ", id)
        collectionName = "ERC1155_" + nftAddress
        nftCollectionMap.set(nftAddress, collectionName)
        console.log("Set ERC1155 collection name: ", collectionName)
      }
    }
  }
  return collectionName
}

SeaportProcessor.bind({ address: constant.SEAPORT_ADDRESS, startBlock: 16731645 })
  .onEventOrderFulfilled(async (event, ctx) => {
    ctx.meter.Counter("OrderFilled_Counter").add(1)

    const offerer = event.args.offerer
    const recipient = event.args.recipient
    const zone = event.args.zone
    const offer = event.args.offer
    const consideration = event.args.consideration

    //retrieve offer[0] info

    //skip when empty offer[]
    if (offer.length == 0) return

    const nftAddress = offer[0].token
    const nftType = Number(offer[0].itemType)
    const nftId = Number(offer[0].identifier)
    const nftAmount = Number(offer[0].amount)
    const itemType = Number(offer[0].itemType)

    // const block = Number(ctx.blockNumber)
    // console.log("blockNumber", block)

    //debug getCollection
    // const hash_debug = event.transactionHash
    // let nftCollection = ""

    // switch (itemType) {
    //   case 2: {
    //     nftCollection = (await getERC721Name(nftAddress, hash_debug))!
    //     break
    //   }
    //   case 3: {
    //     nftCollection = (await getERC1155Name(nftAddress, nftId, hash_debug))!
    //     break
    //   }
    //   default: {
    //     console.log("itemType: " + itemType + ", can't handle the itemType, skip for now. TxHash: " + hash_debug)
    //     break
    //   }
    // }

    // console.log("nftAddress, Type, Id, Amount, Collection: ", nftAddress, " ", nftType, " ", nftId, " ", nftAmount, " ", nftCollection)

    //retrieve consideration value, only considering eth atm
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
    if (fillSource == "Blur") {
      console.log(`blur->os tx: ${hash}`)
    }

    //event
    ctx.eventLogger.emit("OrderFilled_Event",
      {
        distinctId: recipient,
        offerer: offerer,
        fillSource: fillSource,
        zone: zone,
        nftAddress: nftAddress,
        // nftCollection: nftCollection,
        nftType: nftType,
        nftId: nftId,
        nftAmount: nftAmount,
        value: value,
        message: " NFT Address: " + nftAddress + " Id:" + nftId + " Value: " + value + " ETH" + " Fill Source: " + fillSource + "OTHER_INTERNAL_HTTP_REQUEST_LOGS" + " Recipient: " + recipient + " Offerer: " + offerer
        // message: " NFT Collection: " + nftCollection + " Id:" + nftId + " Value: " + value + " ETH" + " Fill Source: " + fillSource + "OTHER_INTERNAL_HTTP_REQUEST_LOGS" + " Recipient: " + recipient + " Offerer: " + offerer
      })


  })

BlurExchangeProcessor.bind({ address: constant.BLUR_EXCHANGE_ADDRESS, startBlock: 16731645 })
  .onEventOrdersMatched(async (event, ctx) => {
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
        console.log(e.message, "BlurEx retrieve transaction data failed")
      }
    }
    fillSource = getFillSource(inputDataSuffix)
    // if (fillSource == "Opensea") {
    //   console.log(`blur->os tx: ${hash}`)
    // }

    const maker = event.args.maker
    const taker = event.args.taker


  })