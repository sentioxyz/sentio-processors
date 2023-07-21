import { ERC721Processor, ERC1155Processor } from "@sentio/sdk/eth/builtin";
import { getERC721Contract } from '@sentio/sdk/eth/builtin/erc721'
import { getERC1155Contract } from "@sentio/sdk/eth/builtin/erc1155";
import { EthChainId } from "@sentio/sdk/eth";
// import * as constant from './helper/constant.js/'
export const NFT_COLLECTIONS = [
  "0xb62c414abf83c0107db84f8de1c88631c05a8d7b"
]

// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()

async function getERC721Name(nftAddress: string, txHash: string) {
  if (nftAddress.toLowerCase() == "0x0") {
    console.log(" ENS")
    return "ENS"
  }

  let collectionName = nftCollectionMap.get(nftAddress)
  if (!collectionName) {
    try {
      collectionName = await getERC721Contract(EthChainId.LINEA, nftAddress).name()!
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

async function getERC721URI(nftAddress: string, tokenId: number, txHash: string) {
  let uri
  try {
    uri = await getERC721Contract(EthChainId.LINEA, nftAddress).tokenURI(tokenId)!
    console.log("ERC721 uri: ", nftAddress, uri)
  }
  catch (e) {
    if (e instanceof Error) {
      console.log(e.message, " retrieve 721 nft uri  failed. txHash: ", txHash, " nftAddress", nftAddress)
      return "unknown uri"
    }
  }
  return uri
}


// async function getERC1155Name(nftAddress: string, txHash: string) {
//   let collectionName = nftCollectionMap.get(nftAddress)
//   if (!collectionName) {
//     try {
//       //Only handles collection with name() function
//       const collectionName = await getERC721Contract(EthChainId.CRONOS, nftAddress).name()!
//       nftCollectionMap.set(nftAddress, collectionName)
//       console.log("Set ERC1155 collection name: ", collectionName)
//     }
//     catch (e) {
//       if (e instanceof Error) {
//         console.log(e.message, " retrieve 1155 nft collection name failed. txHash: ", txHash, " nftAddress ", nftAddress)
//         collectionName = "ERC1155_" + nftAddress
//         nftCollectionMap.set(nftAddress, collectionName)
//         console.log("Set ERC1155 collection name: ", collectionName)
//       }
//     }
//   }
//   return collectionName
// }


// async function getNameByERCType(type: string, nftAddress: string, txHash: string) {
//   let collectionName = ""
//   if (type == "ERC1155") {
//     collectionName = (await getERC1155Name(nftAddress, txHash))!
//   }
//   else {
//     collectionName = (await getERC721Name(nftAddress, txHash))!
//   }

//   return collectionName
// }



NFT_COLLECTIONS.forEach(address => {
  ERC721Processor.bind({
    address: address,
    network: EthChainId.LINEA
  })
    .onEventTransfer(async (event, ctx) => {
      const txHash = event.transactionHash
      const tokenId = Number(event.args.tokenId)
      const collectionName = await getERC721Name(address, txHash)
      const uri = await getERC721URI(address, tokenId, txHash)
      console.log(uri)
      ctx.eventLogger.emit("Transfer", {
        distinctId: event.args.from,
        to: event.args.to,
        collectionName,
        tokenId,
        uri
      })
    })
})
