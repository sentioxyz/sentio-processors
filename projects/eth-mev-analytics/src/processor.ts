import { Counter, EthFetchConfig, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  GlobalContext,
  GlobalProcessor,
  RichBlock,
  Trace,
} from "@sentio/sdk/eth";
import { TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { Interface } from "ethers";
import { TransactionReceiptParams } from "ethers/providers";

interface dataByTxn {
  blockNumber: number;
  txnHash: string;
  traces: Trace[];
  receipts: TransactionReceiptParams[];
}

// define a struct for edge
interface Edge {
  tokenAddress: string;
  fromAddr: string;
  toAddr: string;
  value: bigint;
}

// define a struct for node
interface Node {
  addr: string;
}

class TokenFlowGraph {
  nodes: Map<Node, number>;
  edges: Map<Edge, number>;

  constructor() {
    this.nodes = new Map<Node, number>();
    this.edges = new Map<Edge, number>();
  }

  addNode(node: Node): void {
    if (this.nodes.has(node)) {
      this.nodes.set(node, 1 + this.nodes.get(node)!);
    } else {
      this.nodes.set(node, 1);
    }
  }

  addEdge(edge: Edge): void {
    if (this.edges.has(edge)) {
      this.edges.set(edge, this.edges.get(edge)! + 1);
    } else {
      this.edges.set(edge, 1);
    }
  }
}

function buildGraph(d: dataByTxn, ctx: GlobalContext): TokenFlowGraph {
  let graph: TokenFlowGraph = new TokenFlowGraph();

  ctx.meter.Counter("all_block").add(1);
  console.log("block", ctx.blockNumber);

  for (const trace of d.traces || []) {
    if (trace.type === "call") {
      if (trace.action.input == "0x") {
        ctx.meter.Counter("eth_transfer").add(1);
        if (trace.action.to === undefined) {
          console.log("undefined to");
          continue;
        }
        graph.addNode({
          addr: trace.action.from,
        });
        graph.addNode({
          addr: trace.action.to,
        });
        graph.addEdge({
          tokenAddress: "0x",
          fromAddr: trace.action.from,
          toAddr: trace.action.to,
          value: BigInt(trace.action.value),
        });
      }
    }
  }

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
          graph.addNode({
            addr: tokenAddress,
          });
          graph.addNode({
            addr: transfer.args.from,
          });
          graph.addNode({
            addr: transfer.args.to,
          });
          graph.addEdge({
            tokenAddress: tokenAddress,
            fromAddr: transfer.args.from,
            toAddr: transfer.args.to,
            value: transfer.args.value,
          });
        }
      }
    } catch (e) {
      ctx.meter.Counter("erc20_transfer_decoding_error").add(1);
    }
  }
  return graph;
}

const START_BLOCK = 0x104fb1f;

function getDataByTxn(
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

GlobalProcessor.bind({ startBlock: START_BLOCK }).onBlockInterval(
  async (b, ctx) => {
    console.log(b.number);
    const dataByTxn = getDataByTxn(b, ctx);
    console.log("test");
    console.log("dataByTxn size:", dataByTxn.size);
    for (const [txnHash, data] of dataByTxn) {
      console.log("txnHash:", txnHash);
      const graph = buildGraph(data, ctx);
      console.log("graph size: ", graph.nodes.size, graph.edges.size);
    }
  },
  10000000,
  100000000,
  {
    block: true,
    transaction: true,
    transactionReceipt: true,
    trace: true,
  }
);
