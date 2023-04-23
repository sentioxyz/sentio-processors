import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { DepositEvent, WithdrawalEvent } from "./types/eth/weth9.js";
import { TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { Interface } from "ethers";
import { TransactionReceiptParams } from "ethers/providers";

import { GlobalContext, RichBlock, Trace } from "@sentio/sdk/eth";
import { TokenFlowGraph } from "./graph.js";

interface dataByTxn {
  blockNumber: number;
  txnHash: string;
  traces: Trace[];
  receipts: TransactionReceiptParams[];
}

function buildNativeETH(
  graph: TokenFlowGraph,
  d: dataByTxn,
  ctx: GlobalContext
) {
  for (const trace of d.traces || []) {
    if (trace.type === "call") {
      if (trace.action.input == "0x") {
        ctx.meter.Counter("eth_transfer").add(1);
        if (trace.action.to === undefined) {
          console.log("undefined to");
          continue;
        }
        graph.addEdge(trace.action.from, {
          toAddr: trace.action.to,
          tokenAddress: "0x",
          value: BigInt(trace.action.value),
        });
      }
    }
  }
}

function buildERC20(graph: TokenFlowGraph, d: dataByTxn, ctx: GlobalContext) {
  const iface = new Interface([
    {
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
    },
  ]);

  const fragment = iface.getEvent("Transfer")!;
  for (const tx of d.receipts || []) {
    try {
      for (const log of tx.logs || []) {
        if (log.topics[0] !== fragment.topicHash) {
          continue;
        }
        let tokenAddress = log.address;
        const parsed = iface.parseLog(log as any);
        if (parsed) {
          const transfer = {
            ...log,
            name: parsed.name,
            args: parsed.args,
          } as any as TransferEvent;
          ctx.meter.Counter("erc20_transfer").add(1);
          graph.addEdge(transfer.args.from, {
            toAddr: transfer.args.to,
            tokenAddress: tokenAddress,
            value: transfer.args.value,
          });
        }
      }
    } catch (e) {
      ctx.meter.Counter("erc20_transfer_decoding_error").add(1);
    }
  }
}

function buildWETH(graph: TokenFlowGraph, d: dataByTxn, ctx: GlobalContext) {
  const iface = new Interface([
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: "dst", type: "address" },
        { indexed: false, name: "wad", type: "uint256" },
      ],
      name: "Deposit",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: "src", type: "address" },
        { indexed: false, name: "wad", type: "uint256" },
      ],
      name: "Withdrawal",
      type: "event",
    },
  ]);

  let fragment = iface.getEvent("Deposit")!;
  for (const tx of d.receipts || []) {
    try {
      for (const log of tx.logs || []) {
        if (log.topics[0] !== fragment.topicHash) {
          continue;
        }
        let tokenAddress = log.address;
        const parsed = iface.parseLog(log as any);
        if (parsed) {
          const deposit = {
            ...log,
            name: parsed.name,
            args: parsed.args,
          } as any as DepositEvent;
          ctx.meter.Counter("weth_deposit").add(1);
          graph.addEdge(tokenAddress, {
            toAddr: deposit.args.dst,
            tokenAddress: tokenAddress,
            value: deposit.args.wad,
          });
        }
      }
    } catch (e) {
      ctx.meter.Counter("erc20_transfer_decoding_error").add(1);
    }
  }

  fragment = iface.getEvent("Withdrawal")!;
  for (const tx of d.receipts || []) {
    try {
      for (const log of tx.logs || []) {
        if (log.topics[0] !== fragment.topicHash) {
          continue;
        }
        let tokenAddress = log.address;
        const parsed = iface.parseLog(log as any);
        if (parsed) {
          const deposit = {
            ...log,
            name: parsed.name,
            args: parsed.args,
          } as any as WithdrawalEvent;
          ctx.meter.Counter("weth_withdraw").add(1);
          graph.addEdge(deposit.args.src, {
            toAddr: tokenAddress,
            tokenAddress: tokenAddress,
            value: deposit.args.wad,
          });
        }
      }
    } catch (e) {
      ctx.meter.Counter("erc20_transfer_decoding_error").add(1);
    }
  }
}

export function buildGraph(d: dataByTxn, ctx: GlobalContext): TokenFlowGraph {
  let graph: TokenFlowGraph = new TokenFlowGraph();

  ctx.meter.Counter("all_block").add(1);
  console.log("block", ctx.blockNumber);
  buildNativeETH(graph, d, ctx);
  buildERC20(graph, d, ctx);
  buildWETH(graph, d, ctx);
  return graph;
}

export function getDataByTxn(
  b: RichBlock,
  ctx: GlobalContext
): Map<string, dataByTxn> {
  let ret = new Map<string, dataByTxn>();

  for (const trace of b.traces || []) {
    // add trace to ret
    if (ret.has(trace.transactionHash)) {
      ret.get(trace.transactionHash)!.traces.push(trace);
    } else {
      ret.set(trace.transactionHash, {
        blockNumber: b.number,
        txnHash: trace.transactionHash,
        traces: [trace],
        receipts: [],
      });
    }
  }

  for (const tx of b.transactionReceipts || []) {
    // add receipt to ret
    if (ret.has(tx.hash)) {
      ret.get(tx.hash)!.receipts.push(tx);
    } else {
      ret.set(tx.hash, {
        blockNumber: b.number,
        txnHash: tx.hash,
        traces: [],
        receipts: [tx],
      });
    }
  }

  return ret;
}
