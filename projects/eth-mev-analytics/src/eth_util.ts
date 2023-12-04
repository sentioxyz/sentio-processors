import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import * as weth from "./types/eth/weth9.js";
import { TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { Interface, LogParams } from "ethers";
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
  feeRecipent: string;
  trueReceiver: string;
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
            index: 0,
          },
          "native"
        );
      }
    }
  }
}

function decodeAsERC20Transfer(log: LogParams, graph: TokenFlowGraph): boolean {
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
  if (log.topics[0] !== fragment.topicHash) {
    return false;
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
        index: 0,
      },
      "erc20"
    );
    return true;
  }
  return false;
}

function decodeAsWETHDeposit(log: LogParams, graph: TokenFlowGraph): boolean {
  let tokenAddress = log.address;
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
  ]);
  let fragment = iface.getEvent("Deposit")!;
  if (log.topics[0] !== fragment.topicHash) {
    return false;
  }

  let parsed = iface.parseLog(log as any);
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
        index: 0,
      },
      "weth_deposit"
    );
    return true;
  }
  return false;
}

function decodeAsWETHWithdraw(log: LogParams, graph: TokenFlowGraph): boolean {
  let tokenAddress = log.address;
  const iface = new Interface([
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
  let fragment = iface.getEvent("Withdrawal")!;
  if (log.topics[0] !== fragment.topicHash) {
    return false;
  }

  let parsed = iface.parseLog(log as any);
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
        index: 0,
      },
      "weth_withdrawal"
    );
    return true;
  }
  return false;
}

function buildERC20AndWETH(
  graph: TokenFlowGraph,
  d: dataByTxn,
  chainConfig: ChainConstants
) {
  for (const tx of d.transactionReceipts || []) {
    try {
      for (const log of tx.logs || []) {
        if (decodeAsERC20Transfer(log, graph)) {
          continue;
        }
        if (decodeAsWETHDeposit(log, graph)) {
          continue;
        }
        if (decodeAsWETHWithdraw(log, graph)) {
          continue;
        }
      }
    } catch (e) { }
  }
}

export function buildGraph(
  d: dataByTxn,
  chainConfig: ChainConstants
): TokenFlowGraph {
  let graph: TokenFlowGraph = new TokenFlowGraph();

  buildNativeETH(graph, d, chainConfig);
  buildERC20AndWETH(graph, d, chainConfig);
  return graph;
}

export function getDataByTxn(
  b: RichBlock,
  chainConfig: ChainConstants
): Map<string, dataByTxn> {
  let ret = new Map<string, dataByTxn>();
  let trueReceiver: string = "";
  for (const tx of b.transactions || []) {
    // check if tx is string
    if (typeof tx === "string") {
      continue;
    }
    if (tx.to === undefined || tx.to === null) {
      continue;
    }
    trueReceiver = tx.to!.toLowerCase();

    // add tx to ret
    ret.set(tx.hash, {
      transactionReceipts: [],
      traces: [],
      blockNumber: b.number,
      tx: tx,
      feeRecipent: b.miner.toLowerCase(),
      trueReceiver: trueReceiver,
    });
  }

  for (const trace of b.traces || []) {
    if (!ret.has(trace.transactionHash)) {
      continue;
    }
    ret.get(trace.transactionHash)!.traces.push(trace);
  }

  for (const kv of ret.entries()) {
    const hash = kv[0];
    const data = kv[1];
    for (const trace of data.traces || []) {
      if (trace.action.to === undefined) {
        continue;
      }
      if (chainConfig.trueReceivers.has(trace.action.to.toLowerCase())) {
        ret.get(hash)!.trueReceiver = trace.action.to.toLowerCase();
        break;
      }
    }
  }

  for (const tx of b.transactionReceipts || []) {
    if (!ret.has(tx.hash)) {
      continue;
    }
    ret.get(tx.hash)!.transactionReceipts.push(tx);
  }

  return ret;
}
