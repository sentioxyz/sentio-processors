import { Counter, EthFetchConfig, Gauge, CHAIN_IDS } from "@sentio/sdk";

import {
  GlobalContext,
  GlobalProcessor,
  RichBlock,
  Trace,
} from "@sentio/sdk/eth";

import { getDataByTxn, buildGraph, dataByTxn } from "./eth_util.js";
import {
  findBalanceChanges,
  getAddressProperty,
  AddressProperty,
  getRolesCount,
  winnerRewards,
  getProperty,
  printBalances,
} from "./classifier.js";

import { chainConfigs, ChainConstants } from "./common.js";

let START_BLOCK = 1000000000;

export function handleBlock(
  b: RichBlock,
  chainConfig: ChainConstants
): Array<string> {
  const ret = new Array<string>();
  const dataByTxn = getDataByTxn(b);
  console.log(`block ${b.number} has ${dataByTxn.size} txns`);
  for (const [txnHash, data] of dataByTxn) {
    if (handleTxn(data, chainConfig)) {
      ret.push(txnHash);
    }
  }
  return ret;
}

export function handleTxn(
  data: dataByTxn,
  chainConfig: ChainConstants
): boolean {
  const graph = buildGraph(data, chainConfig);
  let total = 0;
  for (const [node, edges] of graph.adjList) {
    total += edges.size;
  }
  const sccs = graph.findStronglyConnectedComponents();
  //  graph.print();
  const balances = findBalanceChanges(sccs, graph);
  //  printBalances(balances);
  const addressProperty = getAddressProperty(balances);
  const rolesCount = getRolesCount(addressProperty);
  const sender = data.tx.from.toLowerCase();
  if (data.tx.to === undefined || data.tx.to === null) {
    return false;
  }
  const receiver = data.tx.to!.toLowerCase();
  const rewards = winnerRewards(sender, receiver, sccs, balances, graph);
  const gasPrice = data.tx.gasPrice;
  if (data.transactionReceipts.length === 0) {
    console.log("no transaction receipt");
  } else if (data.transactionReceipts[0].gasUsed === undefined) {
    console.log("gas used is undefined");
  }

  if (
    getProperty("group", rewards) == AddressProperty.Winner &&
    rolesCount.get(AddressProperty.Trader)! > 1
  ) {
    return true;
  }
  return false;
}

for (const chainConfig of chainConfigs) {
  GlobalProcessor.bind({
    startBlock: START_BLOCK,
    network: chainConfig.chainID,
  }).onBlockInterval(
    async (b, ctx) => {
      const txnHashes = handleBlock(b, chainConfig);
      for (const txnHash of txnHashes) {
        const link = `https://explorer.phalcon.xyz/tx/eth/${txnHash}`;
        ctx.eventLogger.emit("arbitrage", {
          message: `Arbitrage txn detected: ${link}`,
          link: link,
        });
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
}
