import { EthChainId, EthContext, GenericProcessor, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { POL_TRANSFER_TOPIC, PolygonRollupManager, PolygonValidiumEtrog, PolygonZkEVMBridgeV2 } from './constant.js'

GlobalProcessor.bind({ network: EthChainId.LUMIO_TESTNET }).onTransaction(
  async (tx, ctx) => {
    // const provider = ctx.contract.provider
    // const hexBlockNumber = tx.blockNumber?.toString(16)
    // const batch = hexBlockNumber
    //   ? await provider.send('zkevm_batchNumberByBlockNumber', ['0x' + hexBlockNumber])
    //   : undefined
    // ctx.eventLogger.emit('l2_tx', {
    //   distinctId: tx.hash,
    //   value: tx.value,
    //   gasCost: gasCost(ctx),
    // })
    ctx.eventLogger.emit('l2_tx', {
      distinctId: tx.hash,
      wallet: tx.from,
      value: tx.value,
      hash: tx.hash,

      // gasCost: gasCost(ctx),
    })
  },
  {
    transaction: true,
    // transactionReceipt: true,
  },
)

function gasCost(ctx: EthContext) {
  return (
      BigInt(
          ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n,
      ) * BigInt(ctx.transactionReceipt?.gasUsed || 0)
  )
}
