import { Counter, EthFetchConfig, Gauge } from "@sentio/sdk";

import {
  GlobalContext,
  GlobalProcessor,
  RichBlock,
  Trace,
} from "@sentio/sdk/eth";

import { getDataByTxn, buildGraph } from "./eth_util.js";
import {
  findBalanceChanges,
  getAddressProperty,
  AddressProperty,
  getRolesCount,
  winnerRewards,
  getProperty,
} from "./classifier.js";

const START_BLOCK = 16818057;

GlobalProcessor.bind({ startBlock: START_BLOCK }).onBlockInterval(
  async (b, ctx) => {
    const dataByTxn = getDataByTxn(b, ctx);
    for (const [txnHash, data] of dataByTxn) {
      const graph = buildGraph(data, ctx);
      let total = 0;
      for (const [node, edges] of graph.adjList) {
        total += edges.size;
      }
      const sccs = graph.findStronglyConnectedComponents();
      //graph.print();
      const ret = findBalanceChanges(sccs, graph);
      const addressProperty = getAddressProperty(ret);
      const rolesCount = getRolesCount(addressProperty);
      const sender = data.tx.from.toLowerCase();
      const receiver = data.tx.to!.toLowerCase();
      const rewards = winnerRewards(sender, receiver, sccs, ret, graph);
      if (
        getProperty("group", rewards) == AddressProperty.Winner &&
        rolesCount.get(AddressProperty.Trader)! > 1
      ) {
        const link = `https://explorer.phalcon.xyz/tx/eth/${txnHash}`;
        console.log(link);
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
