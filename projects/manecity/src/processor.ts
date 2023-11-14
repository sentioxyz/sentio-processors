import { EthChainId } from "@sentio/sdk/eth";
import { LoadedLionsTreasuryFacetProcessor } from "./types/eth/loadedlionstreasuryfacet.js";

//Mane City Transactions
LoadedLionsTreasuryFacetProcessor.bind({
  address: "0x0CA35BDF10f0f548857Fe222760bf47761bBaF50",
  network: EthChainId.CRONOS
})
  .onEventDiamondPurchaseInPersistentWorld(async (event, ctx) => {
    const buyer = event.args.sender
    const value = Number(event.args.value) / Math.pow(10, 18)
    console.log("txnHash", ctx.transactionHash, "buyer", buyer, "value", value, "tokenPrice")
    ctx.eventLogger.emit("DiamondPurchaseNormal", {
      buyer: buyer,
      value: value,
      type: "diamond purchase (normal)"
    }
    )
  })
  .onEventDiamondPurchaseInCompetitiveWorld(async (event, ctx) => {
    const buyer = event.args.sender
    const value = Number(event.args.value) / Math.pow(10, 18)
    console.log("txnHash", ctx.transactionHash, "buyer", buyer, "value", value)
    ctx.eventLogger.emit("DiamondPurchaseCompetitive", {
      buyer: buyer,
      value: value,
      type: "diamond purchase (competitive)"
    }
    )
  })
  .onEventBuy(async (event, ctx) => {
    const buyer = event.args.buyer
    const seller = event.args.seller
    const itemId = event.args.itemId
    const value = Number(event.args.value) / Math.pow(10, 18)
    console.log("txnHash", ctx.transactionHash, "buyer", buyer, "seller", seller, "value", value)
    ctx.eventLogger.emit("MarketTxn", {
      buyer: buyer,
      seller: seller,
      itemId: itemId,
      value: value,
      type: "market purchase"
    }
    )
  })
  .onCallBuy(async (call, ctx) => {
    ctx.eventLogger.emit("call", {
    })
  })


LoadedLionsTreasuryFacetProcessor.bind({
  address: "0x0CA35BDF10f0f548857Fe222760bf47761bBaF50",
  network: EthChainId.CRONOS
})
  .onEventBuy(async (event, ctx) => {
    const buyer = event.args.buyer
    const seller = event.args.seller
    const itemId = event.args.itemId
    const value = Number(event.args.value) / Math.pow(10, 18)
    console.log("txnHash", ctx.transactionHash, "buyer", buyer, "seller", seller, "value", value)
    ctx.eventLogger.emit("MarketTxn2", {
      buyer: buyer,
      seller: seller,
      itemId: itemId,
      value: value,
      type: "market purchase"
    }
    )
  })
  .onCallBuy(async (call, ctx) => {
    ctx.eventLogger.emit("call2", {
    })
  })