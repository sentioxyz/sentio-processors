import {
  Counter,
  EthFetchConfig,
  Gauge,
  CHAIN_IDS,
  BigDecimal,
} from "@sentio/sdk";

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

import { getPriceByType, token } from "@sentio/sdk/utils";

import { chainConfigs, ChainConstants } from "./common.js";

let START_BLOCK = 1000000000;

interface TxnResult {
  txnHash: string;
  rewards: Map<string, bigint>;
  costs: Map<string, bigint>;
}

export function handleBlock(
  b: RichBlock,
  chainConfig: ChainConstants
): Array<TxnResult> {
  const ret = new Array<TxnResult>();
  const dataByTxn = getDataByTxn(b);
  console.log(`block ${b.number} has ${dataByTxn.size} txns`);
  for (const [txnHash, data] of dataByTxn) {
    const [result, rewards, costs] = handleTxn(data, chainConfig);
    if (result) {
      ret.push({ txnHash, rewards, costs });
    }
  }
  return ret;
}

export function handleTxn(
  data: dataByTxn,
  chainConfig: ChainConstants
): [boolean, Map<string, bigint>, Map<string, bigint>] {
  const graph = buildGraph(data, chainConfig);
  let rewards = new Map<string, bigint>();
  let costs = new Map<string, bigint>();
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
  if (data.tx.to === undefined || data.tx.to === null) {
    return [false, rewards, costs];
  }
  if (chainConfig.blackListedAddresses.has(data.tx.to.toLowerCase())) {
    console.log("skip blacklisted address for:", data.tx.to, data.tx.hash);
    return [false, rewards, costs];
  }
  const receiver = data.tx.to!.toLowerCase();
  const gasPrice = data.tx.gasPrice;
  if (data.transactionReceipts.length === 0) {
    console.log("no transaction receipt");
  } else if (data.transactionReceipts[0].gasUsed === undefined) {
    console.log("gas used is undefined");
  }
  const gasTotal = data.transactionReceipts[0].gasUsed * BigInt(gasPrice);
  [rewards, costs] = winnerRewards(
    sender,
    receiver,
    sccs,
    balances,
    graph,
    data.feeRecipent
  );
  costs.set("gas", gasTotal);

  if (
    getProperty("group", rewards) == AddressProperty.Winner &&
    rolesCount.get(AddressProperty.Trader)! > 1
  ) {
    return [true, rewards, costs];
  }
  return [false, rewards, costs];
}

type TokenWithPrice = {
  token: token.TokenInfo;
  price: BigDecimal;
  scaledAmount: BigDecimal;
};

async function getTokenWithPrice(
  tokenAddr: string,
  chainID: string,
  timestamp: Date,
  amount: bigint
): Promise<TokenWithPrice | undefined> {
  let tokenInfo: token.TokenInfo;
  try {
    tokenInfo = await token.getERC20TokenInfo(chainID, tokenAddr);
  } catch (e) {
    console.log("get token failed", e, tokenAddr, chainID);
    return undefined;
  }
  let price: any;
  let ret: TokenWithPrice = {
    token: tokenInfo,
    price: BigDecimal(0),
    scaledAmount: BigDecimal(0),
  };
  try {
    price = await getPriceByType(chainID, tokenAddr, timestamp);
    if (isNaN(price)) {
      console.log("price is NaN", tokenAddr, chainID, timestamp);
      return undefined;
    }
    ret.price = BigDecimal(price);
    ret.scaledAmount = amount.scaleDown(tokenInfo.decimal);
    return ret;
  } catch (e) {
    console.log("get price failed", e, tokenAddr, chainID);
  }
  return undefined;
}

async function computePnL(
  ret: TxnResult,
  ctx: GlobalContext,
  config: ChainConstants
): Promise<[BigDecimal, BigDecimal]> {
  let pnl = BigDecimal(0);
  let gasCost = BigInt(0);
  let cost = BigDecimal(0);
  for (const [addr, amount] of ret.rewards) {
    const tokenWithPrice = await getTokenWithPrice(
      addr,
      ctx.chainId.toString(),
      ctx.timestamp,
      amount
    );
    if (tokenWithPrice === undefined) {
      continue;
    }
    pnl = pnl.plus(
      tokenWithPrice.price.multipliedBy(tokenWithPrice.scaledAmount)
    );
  }
  for (const [addr, amount] of ret.costs) {
    if (addr === "gas") {
      gasCost = gasCost + amount;
    }
    const tokenWithPrice = await getTokenWithPrice(
      addr,
      ctx.chainId.toString(),
      ctx.timestamp,
      amount
    );
    if (tokenWithPrice === undefined) {
      continue;
    }
    cost = cost.plus(
      tokenWithPrice.price.multipliedBy(tokenWithPrice.scaledAmount)
    );
  }
  const gasTotal = await getTokenWithPrice(
    config.nativeTokenWrappedAddress,
    ctx.chainId.toString(),
    ctx.timestamp,
    gasCost
  );
  if (gasTotal === undefined) {
    return [pnl, cost];
  }
  cost = cost.plus(gasTotal!.price.multipliedBy(gasTotal!.scaledAmount));

  return [pnl, cost];
}

for (const chainConfig of chainConfigs) {
  GlobalProcessor.bind({
    startBlock: START_BLOCK,
    network: chainConfig.chainID,
  }).onBlockInterval(
    async (b, ctx) => {
      const txnResults = handleBlock(b, chainConfig);
      for (const txn of txnResults) {
        const link = `https://explorer.phalcon.xyz/tx/eth/${txn.txnHash}`;
        const [revenue, cost] = await computePnL(txn, ctx, chainConfig);
        if (revenue.comparedTo(0) <= 0) {
          console.log("revenue is 0, likely not a popular token", txn.txnHash);
          continue;
        }
        ctx.eventLogger.emit("arbitrage", {
          message: `Arbitrage txn detected: ${link}`,
          link: link,
          revenue: revenue,
          cost: cost,
          profit: revenue.minus(cost),
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
