import { MintedexchangeProcessor } from './types/eth/mintedexchange.js'


//first tx block time 6006174	
MintedexchangeProcessor.bind({ address: '0x40cBf9C75a46b147E0fd9aB47df5E064aE015f92', network: 25, startBlock: 6006174 })
  .onEventTakerBid(async (event, ctx) => {
    const taker = event.args.taker
    const maker = event.args.maker
    const strategy = event.args.strategy
    const currency = event.args.currency
    const collection = event.args.collection
    const tokenId = Number(event.args.tokenId)
    const amount = Number(event.args.amount)
    const price = Number(event.args.price) / Math.pow(10, 18)
    console.log("tokenId", tokenId, "amount", amount, "price", price)
    ctx.eventLogger.emit("TakerBid", {
      distinctId: taker,
      maker: maker,
      strategy: strategy,
      currency: currency,
      collection: collection,
      tokenId: tokenId,
      amount: amount,
      price: price
    }
    )

  })
  .onEventRoyaltyPayment(async (event, ctx) => {
    const collection = event.args.collection
    const tokenId = Number(event.args.tokenId)
    const royaltyRecipient = event.args.royaltyRecipient
    const currency = event.args.currency
    const amount = Number(event.args.amount) / Math.pow(10, 18)

    console.log(collection, tokenId, royaltyRecipient, currency, amount)

    const hash = event.transactionHash
    try {
      // console.log("transactionHash", hash)
      const tx = (await ctx.contract.provider.getTransaction(hash))!
      const from = tx.from
      console.log("event royaltypayment transactionHash", hash, "tx from:", from)

      ctx.eventLogger.emit("RoyaltyPayment", {
        distinctId: from,
        collection: collection,
        tokenId: tokenId,
        royaltyRecipient: royaltyRecipient,
        currency: currency,
        amount: amount
      })

    } catch (e) {
      if (e instanceof Error) {
        console.log(e.message)
      }
    }

  })

  // .onAllEvents(async (event: any, ctx: any) => {
  //   const hash = event.transactionHash
  //   try {
  //     // console.log("transactionHash", hash)
  //     var tx = (await ctx.contract.provider.getTransaction(hash))!
  //     var from = tx.from
  //     console.log("mintedexchange transactionHash", hash, "tx from:", from, "event", event.name)

  //     ctx.eventLogger.emit("Any_Event",
  //       {
  //         distinctId: from,
  //         event: event.name
  //       })
  //   } catch (e) {
  //     if (e instanceof Error) {
  //       console.log(e.message)
  //     }
  //   }
  // })