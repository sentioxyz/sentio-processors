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
  txnResult,
  sandwichTxnResult,
  isSandwich,
} from "./classifier.js";

import { getPriceByType, token } from "@sentio/sdk/utils";

import { chainConfigs, ChainConstants } from "./common.js";

interface mevBlockResult {
  arbTxns: Array<txnResult>;
  sandwichTxns: Array<sandwichTxnResult>;
}

export function findSandwich(
  data: Map<string, dataByTxn>,
  arbResults: Map<string, txnResult>
): Array<sandwichTxnResult> {
  let ret = new Array<sandwichTxnResult>();
  let txnMap = new Map<string, Array<dataByTxn>>();
  let txnByIndex = new Map<number, dataByTxn>();
  for (const [_, txnData] of data) {
    if (!arbResults.has(txnData.tx.hash)) {
      continue;
    }
    if (txnData.tx.to === undefined) {
      continue;
    }
    const to = txnData.tx.to!.toLowerCase();
    if (!txnMap.has(to)) {
      txnMap.set(to, new Array<dataByTxn>());
    }

    txnMap.get(to)!.push(txnData);
    txnByIndex.set(txnData.tx.index, txnData);
  }
  // sort array
  for (const [key, txnList] of txnMap) {
    if (txnList.length < 2) {
      continue;
    }
    txnList.sort((a, b) => a.tx.index - b.tx.index);
    let targetStart = 0;

    for (let i = 1; i < txnList.length; i++) {
      if (txnList[i].tx.index - txnList[targetStart].tx.index > 1) {
        const sandwichStart = txnList[targetStart].tx;
        const sandwichEnd = txnList[i].tx;
        var arr = new Array<txnResult>();
        arr.push(arbResults.get(sandwichStart.hash)!);
        for (let j = sandwichStart.index + 1; j < sandwichEnd.index; j++) {
          if (!txnByIndex.has(j)) {
            continue;
          }
          arr.push(arbResults.get(txnByIndex.get(j)!.tx.hash)!);
        }
        arr.push(arbResults.get(sandwichEnd.hash)!);

        const [is, sandwichResult] = isSandwich(arr);
        if (is) {
          ret.push(sandwichResult);
          targetStart = i + 1;
        }
      }
      targetStart = i;
    }
  }
  return ret;
}

export function handleBlock(
  b: RichBlock,
  chainConfig: ChainConstants
): mevBlockResult {
  const dataByTxn = getDataByTxn(b);
  console.log(`block ${b.number} has ${dataByTxn.size} txns`);
  let txnResults = new Map<string, txnResult>();
  for (const [hash, data] of dataByTxn) {
    let ret = txnProfitAndCost(data, chainConfig);
    if (ret.revenue.size > 0) {
      txnResults.set(hash, ret);
    }
  }
  let sandwichResults = findSandwich(dataByTxn, txnResults);
  for (const result of sandwichResults) {
    if (txnResults.has(result.frontTxnHash)) {
      txnResults.delete(result.frontTxnHash);
    }
    if (txnResults.has(result.backTxnHash)) {
      txnResults.delete(result.backTxnHash);
    }
  }
  let arbTxnResults = new Array<txnResult>();
  for (const [hash, result] of txnResults) {
    const txn = dataByTxn.get(hash);
    if (
      isArbitrage(txn!, chainConfig, result.revenue, result.addressProperty)
    ) {
      arbTxnResults.push(result);
    }
  }
  return {
    arbTxns: arbTxnResults,
    sandwichTxns: sandwichResults,
  };
}

export function isArbitrage(
  data: dataByTxn,
  chainConfig: ChainConstants,
  revenue: Map<string, bigint>,
  addressProperty: Map<string, AddressProperty>
): boolean {
  const rolesCount = getRolesCount(addressProperty);
  if (chainConfig.blackListedAddresses.has(data.tx.to!.toLowerCase())) {
    return false;
  }
  let numWinner = 0;
  let numTrader = 0;
  let minerIsWinner =
    addressProperty.has(data.feeRecipent.toLowerCase()) &&
    getProperty("group", revenue) == AddressProperty.Winner;
  if (getProperty("group", revenue) == AddressProperty.Winner) {
    if (rolesCount.has(AddressProperty.Winner)) {
      numWinner = rolesCount.get(AddressProperty.Winner)!;
    }
    if (rolesCount.has(AddressProperty.Trader)) {
      numTrader = rolesCount.get(AddressProperty.Trader)!;
    }
    return minerIsWinner || numTrader > 1;
  }
  return false;
}

export function txnProfitAndCost(
  data: dataByTxn,
  chainConfig: ChainConstants
): txnResult {
  const graph = buildGraph(data, chainConfig);
  let rewards = new Map<string, bigint>();
  let costs = new Map<string, bigint>();
  if (data.tx.to === undefined || data.tx.to === null) {
    return {
      txnHash: data.tx.hash,
      txFrom: data.tx.from,
      revenue: rewards,
      mevContract: "",
      txnIndex: -1,
      costs: costs,
      addressProperty: new Map<string, AddressProperty>(),
    };
  }
  // This is a hack to handle ethers bug.
  // @ts-ignore
  data.tx.index = parseInt(data.tx.transactionIndex);
  if (data.transactionReceipts.length === 0) {
    console.log("no transaction receipt");
  } else if (data.transactionReceipts[0].gasUsed === undefined) {
    console.log("gas used is undefined");
  }
  if (data.transactionReceipts[0].status === 0) {
    return {
      txnHash: data.tx.hash,
      txFrom: data.tx.from,
      revenue: rewards,
      costs: costs,
      txnIndex: data.tx.index,
      mevContract: "",
      addressProperty: new Map<string, AddressProperty>(),
    };
  }
  const sccs = graph.findStronglyConnectedComponents();
  // graph.print();
  const balances = findBalanceChanges(sccs, graph);
  //  printBalances(balances);
  const addressProperty = getAddressProperty(balances);
  const sender = data.tx.from.toLowerCase();

  const receiver = data.tx.to!.toLowerCase();
  const gasPrice = data.tx.gasPrice;
  const gasTotal = data.transactionReceipts[0].gasUsed * BigInt(gasPrice);
  [rewards, costs] = winnerRewards(
    sender,
    receiver,
    sccs,
    balances,
    graph,
    chainConfig.mintBurnAddr,
    data.feeRecipent
  );
  costs.set("gas", gasTotal);
  return {
    txnHash: data.tx.hash,
    txFrom: data.tx.from,
    mevContract: data.tx.to!,
    revenue: rewards,
    txnIndex: data.tx.index,
    costs: costs,
    addressProperty: addressProperty,
  };
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
  revenue: Map<string, bigint>,
  costs: Map<string, bigint>,
  ctx: GlobalContext,
  config: ChainConstants
): Promise<[BigDecimal, BigDecimal]> {
  let pnl = BigDecimal(0);
  let gasCost = BigInt(0);
  let cost = BigDecimal(0);
  for (const [addr, amount] of revenue) {
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
  for (const [addr, amount] of costs) {
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

export function Bind(chainConfig: ChainConstants, startBlock: number) {
  GlobalProcessor.bind({
    startBlock: startBlock,
    network: chainConfig.chainID,
  }).onBlockInterval(
    async (b, ctx) => {
      const mevResults = handleBlock(b, chainConfig);
      for (const txn of mevResults.arbTxns) {
        const link = `https://explorer.phalcon.xyz/tx/${chainConfig.phalconChain}/${txn.txnHash}`;
        const [revenue, cost] = await computePnL(
          txn.revenue,
          txn.costs,
          ctx,
          chainConfig
        );
        if (revenue.comparedTo(0) <= 0) {
          console.log("revenue is 0, likely not a popular token", txn.txnHash);
          continue;
        }
        ctx.eventLogger.emit("arbitrage", {
          message: `Arbitrage txn detected: ${link}`,
          distinctId: txn.mevContract,
          mevContract: txn.mevContract,
          link: link,
          index: txn.txnIndex,
          revenue: BigDecimal(revenue.toFixed(2)),
          cost: BigDecimal(cost.toFixed(2)),
          profit: BigDecimal(revenue.minus(cost).toFixed(2)),
        });
      }
      for (const txn of mevResults.sandwichTxns) {
        const frontLink = `https://explorer.phalcon.xyz/tx/${chainConfig.phalconChain}/${txn.frontTxnHash}`;
        const backLink = `https://explorer.phalcon.xyz/tx/${chainConfig.phalconChain}/${txn.backTxnHash}`;

        const [revenue, cost] = await computePnL(
          txn.revenue,
          txn.costs,
          ctx,
          chainConfig
        );
        if (revenue.comparedTo(0) <= 0) {
          console.log(
            "revenue is 0, likely not a popular token",
            txn.frontTxnHash,
            txn.backTxnHash
          );
          continue;
        }
        ctx.eventLogger.emit("sandwich", {
          message: `Sandwich txn detected: ${frontLink} and ${backLink}`,
          distinctId: txn.mevContract,
          mevContract: txn.mevContract,
          link: backLink,
          index: txn.backTxnIndex,
          frontLink: frontLink,
          frontIndex: txn.frontTxnIndex,
          revenue: BigDecimal(revenue.toFixed(2)),
          cost: BigDecimal(cost.toFixed(2)),
          profit: BigDecimal(revenue.minus(cost).toFixed(2)),
        });
      }
    },
    1,
    1,
    {
      block: true,
      transaction: true,
      transactionReceipt: true,
      trace: true,
    }
  );
}
