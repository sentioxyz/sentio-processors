import { EthChainId, EthContext, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'

GlobalProcessor.bind({
  network: EthChainId.TAIKO_KATLA,
}).onTransaction(
  (tx, ctx) => {
    ctx.eventLogger.emit('tx', {
      distinctId: tx.hash,
      value: tx.value,
      gasCost: gasCost(ctx),
    })
  },
  {
    transaction: true,
    transactionReceipt: true,
  },
)

function gasCost(ctx: EthContext) {
  return (
    BigInt(
      ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n,
    ) * BigInt(ctx.transactionReceipt?.gasUsed || 0)
  )
}
