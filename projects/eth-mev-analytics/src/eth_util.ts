import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import * as weth from "./types/eth/weth9.js";
import { TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { Interface } from "ethers";
import {
  TransactionReceiptParams,
  TransactionResponseParams,
} from "ethers/providers";

import { GlobalContext, RichBlock, Trace } from "@sentio/sdk/eth";
import { TokenFlowGraph } from "./graph.js";

interface dataByTxn {
  blockNumber: number;
  tx: TransactionResponseParams;
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
      if (trace.action.value > 0) {
        ctx.meter.Counter("eth_transfer").add(1);
        if (trace.action.to === undefined) {
          console.log("undefined to");
          continue;
        }
        // Here is a hack to treat ETH as WETH.
        graph.addEdge(trace.action.from.toLowerCase(), {
          toAddr: trace.action.to.toLowerCase(),
          tokenAddress:
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
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
          graph.addEdge(transfer.args.from.toLowerCase(), {
            toAddr: transfer.args.to.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
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
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: "src", type: "address" },
        { indexed: true, name: "dst", type: "address" },
        { indexed: false, name: "wad", type: "uint256" },
      ],
      name: "Transfer",
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
          } as any as weth.DepositEvent;
          ctx.meter.Counter("weth_deposit").add(1);
          graph.addEdge(tokenAddress.toLowerCase(), {
            toAddr: deposit.args.dst.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
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
          } as any as weth.WithdrawalEvent;
          ctx.meter.Counter("weth_withdraw").add(1);
          graph.addEdge(deposit.args.src.toLowerCase(), {
            toAddr: tokenAddress.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
            value: deposit.args.wad,
          });
        }
      }
    } catch (e) {
      ctx.meter.Counter("erc20_transfer_decoding_error").add(1);
    }
  }

  fragment = iface.getEvent("Transfer")!;
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
          } as any as weth.TransferEvent;
          ctx.meter.Counter("weth_transfer").add(1);
          graph.addEdge(transfer.args.src.toLowerCase(), {
            toAddr: transfer.args.dst.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
            value: transfer.args.wad,
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
  for (const tx of b.transactions || []) {
    // check if tx is string
    if (typeof tx === "string") {
      continue;
    }
    // add tx to ret
    ret.set(tx.hash, {
      receipts: [],
      traces: [],
      blockNumber: b.number,
      tx: tx,
    });
  }

  for (const trace of b.traces || []) {
    if (!ret.has(trace.transactionHash)) {
      console.log("trace not found", trace.transactionHash, trace.error);
      continue;
    }
    ret.get(trace.transactionHash)!.traces.push(trace);
  }

  for (const tx of b.transactionReceipts || []) {
    ret.get(tx.hash)!.receipts.push(tx);
  }

  return ret;
}
