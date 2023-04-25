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
  printBalances,
} from "./classifier.js";

let START_BLOCK = 1000000000;

GlobalProcessor.bind({ startBlock: START_BLOCK }).onBlockInterval(
  async (b, ctx) => {
    const dataByTxn = getDataByTxn(b, ctx);
    for (const [txnHash, data] of dataByTxn) {
      /*
      if (
        txnHash !==
        "0xa32c84ad09369880dfbdf01bcacc2de632ab8c49d97c33ef695fd0d344955b3d"
      ) {
        continue;
      }
      */
      const graph = buildGraph(data, ctx);
      let total = 0;
      for (const [node, edges] of graph.adjList) {
        total += edges.size;
      }
      const sccs = graph.findStronglyConnectedComponents();
      //  graph.print();
      const balances = findBalanceChanges(sccs, graph);
      // printBalances(balances);
      const addressProperty = getAddressProperty(balances);
      const rolesCount = getRolesCount(addressProperty);
      const sender = data.tx.from.toLowerCase();
      if (data.tx.to === undefined) {
        continue;
      }
      const receiver = data.tx.to!.toLowerCase();
      const rewards = winnerRewards(sender, receiver, sccs, balances, graph);
      if (
        getProperty("group", rewards) == AddressProperty.Winner &&
        rolesCount.get(AddressProperty.Trader)! > 1
      ) {
        const link = `https://explorer.phalcon.xyz/tx/eth/${txnHash}`;
        ctx.eventLogger.emit("arbitrage", {
          message: `Arbitrage txn detected: ${link}`,
          link: link,
        });
      }
    }
  },
  1,
  10000,
  {
    block: true,
    transaction: true,
    transactionReceipt: true,
    trace: true,
  }
);
