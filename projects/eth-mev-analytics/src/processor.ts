import { Counter, EthFetchConfig, Gauge } from "@sentio/sdk";

import {
  GlobalContext,
  GlobalProcessor,
  RichBlock,
  Trace,
} from "@sentio/sdk/eth";

import { getDataByTxn, buildGraph } from "./eth_util.js";

const START_BLOCK = 16818057;

GlobalProcessor.bind({ startBlock: START_BLOCK }).onBlockInterval(
  async (b, ctx) => {
    console.log(b.number);
    const dataByTxn = getDataByTxn(b, ctx);
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
        console.log(node, " has ", edges.size, " outgoing edges");
        total += edges.size;
      }
      console.log("graph size: ", txnHash, graph.adjList.size, total);

      const sccs = graph.findStronglyConnectedComponents();
      console.log("sccs: ", sccs.length);
      for (const scc of sccs) {
        console.log("scc: ", scc.length, scc.join(", "));
      }
      console.log("receiver:", data.tx.to);
      const ret = graph.findBalanceChanges(data.tx.to!, sccs);
      for (const [addr, change] of ret) {
        for (const [token, value] of change) {
          console.log(addr, token, value);
        }
      }
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
