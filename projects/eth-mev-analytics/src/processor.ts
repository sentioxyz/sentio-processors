import { Counter, EthFetchConfig, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {GlobalProcessor } from '@sentio/sdk/eth'
import {  TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { Interface } from "ethers";


GlobalProcessor.bind({ startBlock: 1000000000n }).onBlockInterval(
  async (b, ctx) => {
  ctx.meter.Counter('all_block').add(1)
  console.log('block', ctx.blockNumber)

  for (const trace of b.traces || []) {
    if (trace.type === 'call') {
      if (trace.action.input == '0x') {
        ctx.meter.Counter('eth_transfer').add(1)
      }
    }
  }

  const iface = new Interface( [{
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  }])

  const fragment = iface.getEvent("Transfer")!
  for (const tx of b.transactionReceipts || []) {
    try {
    for (const log of tx.logs || []) {
      if (log.topics[0] !== fragment.topicHash) {
        continue
      }
      
      const parsed = iface.parseLog(log as any)
      if (parsed) {
        const transfer = { ...log, name: parsed.name, args: parsed.args } as any as TransferEvent
        ctx.meter.Counter('erc20_transfer').add(1)
        ctx.eventLogger.emit("erc20_transfer", {
          from: transfer.args.from,
          to: transfer.args.to,
          value: transfer.args.value,
        })
      }
    }
  } catch (e) {
    ctx.meter.Counter('erc20_transfer_decoding_error').add(1)
  }
  }


}, 1, 1000, {
  block: true,
  transaction: true,
  transactionReceipt: true,
  trace: true,
})