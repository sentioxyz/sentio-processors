import { EthChainId, GlobalProcessor } from "@sentio/sdk/eth";

// GlobalProcessor.bind({
//   network: EthChainId.ETHEREUM,
//   startBlock: 20852572n,
//   endBlock: 21067570n,
// })
// .onTransaction(async (tx, ctx) => {
//   ctx.eventLogger.emit('tx', {txInfo: tx.hash})
// })


GlobalProcessor.bind({
  network: EthChainId.ARBITRUM,
  startBlock: 20389326n,
  endBlock: 268701385n,
})
.onTransaction(async (tx, ctx) => {
  ctx.eventLogger.emit('tx', {txInfo: tx.hash})
})



// GlobalProcessor.bind({
//   network: EthChainId.BASE,
//   startBlock: 20389326n,
//   endBlock: 2168532n,
// })
// .onTransaction(async (tx, ctx) => {
//   ctx.eventLogger.emit('tx', {txInfo: tx.hash})
// })
