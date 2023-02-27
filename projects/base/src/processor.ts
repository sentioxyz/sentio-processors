import { token } from "@sentio/sdk/utils";
import { ApetimismLaunchpadNFTProcessor, ApetimismLaunchpadNFTContext } from "./types/eth/apetimismlaunchpadnft.js";

const collections = [
  "0xc4170956Da51CC6Adb65aae9508125Fa1Cb80309",
  "0x445fbeb5d895A50BCd6c7E1Fa860D014C8244393",
  "0xBa1d23e1e7c5E23Dd335fEA436CFcE3C1ddB04eB",
  "0x0C7E956feFB39818C905b15cD071c4B383D4a3d5",
  "0xC60054F9E68af924f22077232284e27f1Aa19B94",
  "0xC397F00326bcB3eBeeB96448a6ebc7563e32A13a",
  "0x8190930bBf0Ad41F8f85Bc0cDC0a9bc43a07438a",
  "0x89621713A7fE428c31474608BF7755396846248c"
]


const BASE_CHAIN_ID = 84531

// define a map from address to collection name
let collectionName = new Map<string, string>()

const getCollectionName = async function (ctx: ApetimismLaunchpadNFTContext): Promise<string> {
  let name = collectionName.get(ctx.address)
  if (!name) {
    name = await ctx.contract.name()
    collectionName.set(ctx.address, name)
  }
  return name
}

for (let i = 0; i < collections.length; i++) {
  let address = collections[i]
  ApetimismLaunchpadNFTProcessor.bind({ address: address, network: BASE_CHAIN_ID })
    .onEventTransfer(async (event, ctx) => {
      ctx.meter.Counter('transfer').add(1)

      const collectionName = await getCollectionName(ctx)
      const from = event.args.from
      const to = event.args.to
      const tokenId = Number(event.args.tokenId)

      if (from == "0x0000000000000000000000000000000000000000")
        ctx.eventLogger.emit("Mint", {
          distinctId: to,
          tokenId: tokenId,
          collectionName: collectionName,
          collectionAddress: address,
          message: "Mint " + collectionName + " collection #" + tokenId + " token to " + to + "(collection address: " + address + ")"
        })
      else
        ctx.eventLogger.emit("Transfer", {
          distinctId: to,
          from: from,
          tokenId: tokenId,
          collectionName: collectionName,
          collectionAddress: address,
          message: "Transfer " + collectionName + " collection #" + tokenId + " token from " + from + " to " + to + "(collection address: " + address + ")"
        })


    })
    .onAllEvents(async (event, ctx) => { })
}