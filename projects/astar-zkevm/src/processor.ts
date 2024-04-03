import { EthChainId, EthContext, GenericProcessor, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { POL_TRANSFER_TOPIC, PolygonRollupManager, PolygonValidiumEtrog, PolygonZkEVMBridgeV2 } from './constant.js'
import { PolygonZkEVMBridgeV2Processor } from './types/eth/polygonzkevmbridgev2.js'
import { PolygonValidiumEtrogProcessor } from './types/eth/polygonvalidiumetrog.js'
import { getProvider } from '@sentio/sdk/eth'
import { JsonRpcProvider } from 'ethers'

GlobalProcessor.bind({ network: EthChainId.ASTAR_ZKEVM }).onTransaction(
  async (tx, ctx) => {
    const provider = getProvider(EthChainId.ASTAR_ZKEVM) as JsonRpcProvider
    const hexBlockNumber = tx.blockNumber?.toString(16)
    const batch = hexBlockNumber
      ? await provider.send('zkevm_batchNumberByBlockNumber', ['0x' + hexBlockNumber])
      : undefined
    const { sendSequencesTxHash, verifyBatchTxHash } = batch
      ? await provider.send('zkevm_getBatchByNumber', [batch])
      : { sendSequencesTxHash: undefined, verifyBatchTxHash: undefined }
    ctx.eventLogger.emit('l2_tx', {
      distinctId: tx.from,
      value: tx.value,
      gasCost: gasCost(ctx),
      batch: Number(batch),
      sendSequencesTxHash,
      verifyBatchTxHash,
    })
  },
  {
    transaction: true,
    transactionReceipt: true,
  },
)

PolygonZkEVMBridgeV2Processor.bind({
  network: EthChainId.ASTAR_ZKEVM,
  address: PolygonZkEVMBridgeV2.proxy,
}).onEventBridgeEvent(
  (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload = {
      distinctId: tx.from,
      token: 'eth',
      amount: event.args.amount,
    }
    const logs = ctx.transactionReceipt?.logs || []
    if (logs.length > 1) {
      payload.token = logs[0].address
    }
    ctx.eventLogger.emit('bridge', payload)
  },
  undefined,
  {
    transaction: true,
    transactionReceipt: true,
    transactionReceiptLogs: true,
  },
)

PolygonZkEVMBridgeV2Processor.bind({
  network: EthChainId.ASTAR_ZKEVM,
  address: PolygonZkEVMBridgeV2.proxy,
}).onEventClaimEvent(
  (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload: Record<string, string | bigint> = {
      distinctId: tx.from,
      token: 'eth',
      amount: event.args.amount,
    }
    const logs = ctx.transactionReceipt?.logs || []
    if (logs.length > 1) {
      payload.token = logs[0].address
    }
    ctx.eventLogger.emit('claim', payload)
  },
  undefined,
  {
    transaction: true,
    transactionReceipt: true,
    transactionReceiptLogs: true,
  },
)

PolygonValidiumEtrogProcessor.bind({
  address: PolygonValidiumEtrog.proxy,
  startBlock: 19285389,
}).onEventSequenceBatches(
  async (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload: Record<string, any> = {
      value: tx.value,
      gasCost: gasCost(ctx),
      batch: event.args.numBatch,
    }
    const rawTx = await ctx.contract.provider.getTransactionReceipt(tx.hash)
    const rawLogs = rawTx?.logs
    const transferPOL = rawLogs?.[1]
    if (transferPOL && transferPOL.topics[0] == POL_TRANSFER_TOPIC) {
      payload.from = transferPOL.topics[1]
      payload.to = transferPOL.topics[2]
      payload.polAmount = Number(transferPOL.data)
    }
    ctx.eventLogger.emit('sequence_tx', payload)
  },
  undefined,
  {
    transaction: true,
    transactionReceipt: true,
  },
)

PolygonValidiumEtrogProcessor.bind({
  address: PolygonValidiumEtrog.proxy,
  startBlock: 19285389,
}).onEventVerifyBatches(
  async (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload: Record<string, any> = {
      value: tx.value,
      gasCost: gasCost(ctx),
      batch: event.args.numBatch,
    }
    const rawTx = await ctx.contract.provider.getTransactionReceipt(tx.hash)
    const rawLogs = rawTx?.logs
    const transferPOL = rawLogs?.[0]
    if (transferPOL && transferPOL.topics[0] == POL_TRANSFER_TOPIC) {
      payload.from = transferPOL.topics[1]
      payload.to = transferPOL.topics[2]
      payload.polAmount = Number(transferPOL.data)
    }
    ctx.eventLogger.emit('verify_tx', payload)
  },
  undefined,
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
