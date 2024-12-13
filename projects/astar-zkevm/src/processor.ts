import { EthChainId, EthContext, GenericProcessor, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import {
  LayerswapWallet,
  POL_TRANSFER_TOPIC,
  PolygonRollupManager,
  PolygonValidiumEtrog,
  PolygonZkEVMBridgeV2,
  RelayLinkWallet,
} from './constant.js'
import { PolygonZkEVMBridgeV2Processor } from './types/eth/polygonzkevmbridgev2.js'
import { PolygonValidiumEtrogProcessor } from './types/eth/polygonvalidiumetrog.js'
import { getProvider } from '@sentio/sdk/eth'
import { scaleDown } from '@sentio/sdk'
import { JsonRpcProvider } from 'ethers'
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'

GlobalProcessor.bind({ network: EthChainId.ASTAR_ZKEVM })
  .onTransaction(
    async (tx, ctx) => {
      // const hexBlockNumber = tx.blockNumber?.toString(16)
      // const batch = hexBlockNumber
      //   ? await provider.send('zkevm_batchNumberByBlockNumber', ['0x' + hexBlockNumber])
      //   : undefined
      // const { sendSequencesTxHash, verifyBatchTxHash } = batch
      //   ? await provider.send('zkevm_getBatchByNumber', [batch])
      //   : { sendSequencesTxHash: undefined, verifyBatchTxHash: undefined }
      ctx.eventLogger.emit('l2_tx', {
        distinctId: tx.from,
        value: scaleDown(tx.value, 18),
        gasCost: gasCost(ctx),
        // batch: Number(batch),
        // sendSequencesTxHash,
        // verifyBatchTxHash,
      })

      const bridgeName = {
        [LayerswapWallet]: 'layerswap',
        [RelayLinkWallet]: 'relaylink',
      }[tx.from]

      if (bridgeName) {
        ctx.eventLogger.emit('bridge', {
          distinctId: tx.from,
          to: tx.to,
          type: 'in',
          bridgeName,
          coin_symbol: 'eth',
          amount: scaleDown(tx.value, 18),
        })
      }
    },
    {
      transaction: true,
      transactionReceipt: true
    }
  )

PolygonZkEVMBridgeV2Processor.bind({
  network: EthChainId.ASTAR_ZKEVM,
  address: PolygonZkEVMBridgeV2.proxy,
}).onEventBridgeEvent(
  async (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload: Record<string, any> = {
      distinctId: tx.from,
      to: event.args.destinationAddress,
      type: 'out',
      bridgeName: 'polygonzkevmv2',
      coin_symbol: 'eth',
      amount: scaleDown(event.args.amount, 18),
    }
    const logs = ctx.transactionReceipt?.logs || []
    if (logs.length > 1) {
      payload.tokenAddress = logs[0].address
      const contract = getERC20ContractOnContext(ctx, logs[0].address)
      payload.coin_symbol = await contract.symbol()
      const decimals = await contract.decimals()
      payload.amount = scaleDown(event.args.amount, decimals)
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
  async (event, ctx) => {
    const tx = ctx.transaction
    if (!tx) {
      return
    }
    const payload: Record<string, any> = {
      distinctId: tx.from,
      to: event.args.destinationAddress,
      type: 'in',
      bridgeName: 'polygonzkevmv2',
      coin_symbol: 'eth',
      amount: scaleDown(event.args.amount, 18),
    }
    const logs = ctx.transactionReceipt?.logs || []
    if (logs.length > 1) {
      payload.tokenAddress = logs[0].address
      const contract = getERC20ContractOnContext(ctx, logs[0].address)
      payload.coin_symbol = await contract.symbol()
      const decimals = await contract.decimals()
      payload.amount = scaleDown(event.args.amount, decimals)
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
      value: scaleDown(tx.value, 18),
      gasCost: gasCost(ctx),
      batch: event.args.numBatch,
    }
    const rawTx = await ctx.contract.provider.getTransactionReceipt(tx.hash)
    const rawLogs = rawTx?.logs
    const transferPOL = rawLogs?.[1]
    if (transferPOL && transferPOL.topics[0] == POL_TRANSFER_TOPIC) {
      payload.from = transferPOL.topics[1]
      payload.to = transferPOL.topics[2]
      payload.polAmount = scaleDown(BigInt(transferPOL.data), 18)
    }
    ctx.eventLogger.emit('sequence_tx', payload)
  },
  undefined,
  {
    transaction: true,
    transactionReceipt: true,
  }
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
      value: scaleDown(tx.value, 18),
      gasCost: gasCost(ctx),
      batch: event.args.numBatch,
    }
    const rawTx = await ctx.contract.provider.getTransactionReceipt(tx.hash)
    const rawLogs = rawTx?.logs
    const transferPOL = rawLogs?.[0]
    if (transferPOL && transferPOL.topics[0] == POL_TRANSFER_TOPIC) {
      payload.from = transferPOL.topics[1]
      payload.to = transferPOL.topics[2]
      payload.polAmount = scaleDown(BigInt(transferPOL.data), 18)
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
  const gas =
    BigInt(
      ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n,
    ) * BigInt(ctx.transactionReceipt?.gasUsed || 0)
  return scaleDown(gas, 18)
}
