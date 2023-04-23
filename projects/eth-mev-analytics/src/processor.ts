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
  readonly tokenAddress: string;
  readonly toAddr: string;
  readonly value: bigint;
}

class TokenFlowGraph {
  adjList: Map<string, Map<string, Edge>>;

  constructor() {
    this.adjList = new Map<string, Map<string, Edge>>();
  }

  addEdge(from: string, edge: Edge): void {
    from = from.toLowerCase();
    const edgeKey =
      edge.tokenAddress.toLowerCase() + "/" + edge.toAddr.toLowerCase();
    if (!this.adjList.has(from)) {
      this.adjList.set(from, new Map<string, Edge>());
    }
    if (this.adjList.get(from)!.has(edgeKey)) {
      const oldEdge = this.adjList.get(from)!.get(edgeKey)!;
      this.adjList.get(from)!.set(edgeKey, {
        ...edge,
        value: oldEdge.value + edge.value,
      });
    }
    this.adjList.get(from)!.set(edgeKey, edge);
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
        graph.addEdge(trace.action.from, {
          toAddr: trace.action.to,
          tokenAddress: "0x",
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
  return graph;
}

const START_BLOCK = 16818057;

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
      if (
        txnHash !==
        "0x71a908be0bef6174bccc3d493becdfd28395d78898e355d451cb52f7bac38617"
      ) {
        continue;
      }
      const graph = buildGraph(data, ctx);
      let total = 0;
      for (const [node, edges] of graph.adjList) {
        console.log(node, " ", edges.size);
        total += edges.size;
        for (const [edgeKey, edge] of edges) {
          console.log(node, edge.toAddr, edge.value, edge.tokenAddress);
        }
      }
      console.log("graph size: ", txnHash, graph.adjList.size, total);
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
