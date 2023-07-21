import { ERC721Processor, ERC1155Processor } from "@sentio/sdk/eth/builtin";
import { getERC721Contract } from '@sentio/sdk/eth/builtin/erc721'
import { getERC1155Contract } from "@sentio/sdk/eth/builtin/erc1155";
import { EthChainId } from "@sentio/sdk/eth";
// import * as constant from './helper/constant.js/'
export const NFT_COLLECTIONS = [
  "0xb62c414abf83c0107db84f8de1c88631c05a8d7b",
  "0xaada8a00a35578c9156b45cb325beac0feeff177",
  "0xa9d89db621ce93102c1e8a7ae6261023b1258361",
  "0x0fec1140b0f47b4da07087577bc7655a8645372d",
  "0xf58fef85ce0e179041258ec1de33165d961882dc",
  "0xe0edc0b61d21472516de6356d9ca0e9fdaeee47b",
  "0xcaeddd2462016af033526fd4fb542cd3c392dd72",
  "0x7b9545c9bd7f850381e7913399668e5fc364b524",
  "0x2842049cddf138adf63f392285607751c15104fd",
  "0xf92fae9a2b66fc8cf0c6cd977876ba28c39f0dce",
  "0xb79e67612b01b3b4ecc58139e90f376b68dca0de",
  "0x8a1a1b4777b4dc808a96606fa4611e76f575c823",
  "0xf0d4f9a29a88546dcd91ce8957ccaf150095981f",
  "0x6d4c45c167e850996db3064e65eb8c621e7bf1b2",
  "0xeb39c5f0de48f55dd642853efc6465bef45a484a",
  "0x652d8c99bf28933491399fddca5d0dd318738295",
  "0xb9d45a87f3a3d02c717da5f61c8a8b5d29d12412",
  "0x35e502550553a723848c96bd7945a11c5ef067f6",
  "0x5a4f83c9a13637d422aebcbeef289201cbb7ab20",
  "0x2e71836ec13a74d2db747b4a3f82a34a8ed69c22",
  "0xdad2d131b2cb7adfe73d63fd6e52b1c39df4eac1",
  "0x2d09eaa3920feaa6bc19c7471c1d81b38cefc0a3",
  "0xbb589cc830c7187214d8db9901b17aea8bd6648e",
  "0x851b78dc762f902e38b1eb15b0feb26a7a059108",
  "0x3297c334261da3ed4e129106f7240255c7e9b0a0",
  "0xd8c43fa50967263ecbd3970c32c7775d74e94066",
  "0x07935e74d1f1f888de4109b87a5747f4920f0a9f",
  "0xb985fb61c0ba04407165366342937218eb0d3ad2",
  "0x4b8a8091889e00bac5f411de026f5a17fbae1e49",
  "0x1a7b46c660603ebb5fbe3ae51e80ad21df00bdd1",
  "0xa9d89db621ce93102c1e8a7ae6261023b1258361",
]

// define a map from collection address to name
let nftCollectionMap = new Map<string, string>()

async function getERC721Name(nftAddress: string, txHash: string) {
  if (nftAddress.toLowerCase() == "0x7b9545c9bd7f850381e7913399668e5fc364b524" || nftAddress.toLowerCase() == "0x33084a2a5e90622033caac1fe1aa0ed2de41cf4b") {
    console.log("Linea Name Service")
    return "Linea Name Service"
  }

  let collectionName = nftCollectionMap.get(nftAddress)
  if (!collectionName) {
    try {
      collectionName = await getERC721Contract(EthChainId.LINEA, nftAddress).name()!
      nftCollectionMap.set(nftAddress.toLowerCase(), collectionName)
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
    const metadataURL = await getERC721Contract(EthChainId.LINEA, nftAddress).tokenURI(tokenId)!
    if (metadataURL.slice(0, 4) == "ipfs" || metadataURL.slice(0, 4) == "http") {
      const data = await fetch(metadataURL)
      uri = await data.json()
    }
    else {
      console.log("new url: ", metadataURL.slice(0, 4), metadataURL, " ", txHash)
    }
    console.log(uri)
    console.log("ERC721 uri: ", nftAddress, uri)
  }
  catch (e) {
    if (e instanceof Error) {
      console.log(e.message, " retrieve 721 nft uri failed. txHash: ", txHash, " nftAddress", nftAddress)
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
      // const uri = await getERC721URI(address, tokenId, txHash)
      // console.log(uri)

      const from = event.args.from
      const to = event.args.to
      let eventName = "Transfer"
      if (from.toLowerCase() == "0x0000000000000000000000000000000000000000") {
        eventName = "Mint"
      }
      else if (to.toLowerCase() == "0x0000000000000000000000000000000000000000") {
        eventName = "Burnt"
      }
      ctx.eventLogger.emit(eventName, {
        distinctId: from,
        to,
        collectionName,
        tokenId,
        // uri
      })
    })
})
