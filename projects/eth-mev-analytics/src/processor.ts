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

let START_BLOCK = 1000000000;

CHAIN_IDS.ETHEREUM;
// define a constant map from string to a list of builder addresses
let builderAddressesByChain: Map<string, Set<string>>;
builderAddressesByChain = new Map<string, Set<string>>();
builderAddressesByChain.set(
  CHAIN_IDS.ETHEREUM,
  new Set<string>([
    "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5", // beaver
    "0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5", // flashbots
  ])
);

export function handleBlock(b: RichBlock): Array<string> {
  const ret = new Array<string>();
  const dataByTxn = getDataByTxn(b);
  console.log(`block ${b.number} has ${dataByTxn.size} txns`);
  for (const [txnHash, data] of dataByTxn) {
    if (handleTxn(data)) {
      ret.push(txnHash);
    }
  }
  return ret;
}

export function handleTxn(data: dataByTxn): boolean {
  const graph = buildGraph(data);
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
  if (
    getProperty("group", rewards) == AddressProperty.Winner &&
    rolesCount.get(AddressProperty.Trader)! > 1
  ) {
    return true;
  }
  return false;
}

GlobalProcessor.bind({ startBlock: START_BLOCK }).onBlockInterval(
  async (b, ctx) => {
    const txnHashes = handleBlock(b);
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
