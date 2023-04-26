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
import { chainConfigs, ChainConstants } from "./common.js";

export interface dataByTxn {
  blockNumber: number;
  tx: TransactionResponseParams;
  traces: Trace[];
  transactionReceipts: TransactionReceiptParams[];
}

function buildNativeETH(
  graph: TokenFlowGraph,
  d: dataByTxn,
  chainConfig: ChainConstants
) {
  for (const trace of d.traces || []) {
    if (trace.type === "call") {
      if (trace.action.value > 0) {
        if (trace.action.to === undefined) {
          console.log("undefined to");
          continue;
        }
        // Here is a hack to treat ETH as WETH.
        graph.addEdge(
          trace.action.from.toLowerCase(),
          {
            toAddr: trace.action.to.toLowerCase(),
            tokenAddress: chainConfig.nativeTokenWrappedAddress.toLowerCase(),
            value: BigInt(trace.action.value),
          },
          "native"
        );
      }
    }
  }
}

function buildERC20(
  graph: TokenFlowGraph,
  d: dataByTxn,
  chainConfig: ChainConstants
) {
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
  for (const tx of d.transactionReceipts || []) {
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
          graph.addEdge(
            transfer.args.from.toLowerCase(),
            {
              toAddr: transfer.args.to.toLowerCase(),
              tokenAddress: tokenAddress.toLowerCase(),
              value: transfer.args.value,
            },
            "erc20"
          );
        }
      }
    } catch (e) {}
  }
}

function buildWETH(
  graph: TokenFlowGraph,
  d: dataByTxn,
  chainConfig: ChainConstants
) {
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
  for (const tx of d.transactionReceipts || []) {
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
          graph.addEdge(
            tokenAddress.toLowerCase(),
            {
              toAddr: deposit.args.dst.toLowerCase(),
              tokenAddress: tokenAddress.toLowerCase(),
              value: deposit.args.wad,
            },
            "weth_deposit"
          );
        }
      }
    } catch (e) {}
  }

  fragment = iface.getEvent("Withdrawal")!;
  for (const tx of d.transactionReceipts || []) {
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
          graph.addEdge(
            deposit.args.src.toLowerCase(),
            {
              toAddr: tokenAddress.toLowerCase(),
              tokenAddress: tokenAddress.toLowerCase(),
              value: deposit.args.wad,
            },
            "weth_withdrawal"
          );
        }
      }
    } catch (e) {}
  }
}

export function buildGraph(
  d: dataByTxn,
  chainConfig: ChainConstants
): TokenFlowGraph {
  let graph: TokenFlowGraph = new TokenFlowGraph();

  buildNativeETH(graph, d, chainConfig);
  buildERC20(graph, d, chainConfig);
  buildWETH(graph, d, chainConfig);
  return graph;
}

export function getDataByTxn(b: RichBlock): Map<string, dataByTxn> {
  let ret = new Map<string, dataByTxn>();
  for (const tx of b.transactions || []) {
    // check if tx is string
    if (typeof tx === "string") {
      continue;
    }
    // add tx to ret
    ret.set(tx.hash, {
      transactionReceipts: [],
      traces: [],
      blockNumber: b.number,
      tx: tx,
    });
  }

  for (const trace of b.traces || []) {
    if (!ret.has(trace.transactionHash)) {
      continue;
    }
    ret.get(trace.transactionHash)!.traces.push(trace);
  }

  for (const tx of b.transactionReceipts || []) {
    ret.get(tx.hash)!.transactionReceipts.push(tx);
  }

  return ret;
}
