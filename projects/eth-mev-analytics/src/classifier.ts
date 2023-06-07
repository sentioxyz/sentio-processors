import { TokenFlowGraph } from "./graph.js";

function adjustBalance(
  value: bigint,
  addr: string,
  tokenAddr: string,
  add: boolean,
  balances: Map<string, Map<string, bigint>>
): void {
  if (!balances.has(addr)) {
    balances.set(addr, new Map());
  }
  if (!balances.get(addr)!.has(tokenAddr)) {
    balances.get(addr)!.set(tokenAddr, BigInt(0));
  }
  if (add) {
    balances
      .get(addr)!
      .set(tokenAddr, balances.get(addr)!.get(tokenAddr)! + value);
  } else {
    balances
      .get(addr)!
      .set(tokenAddr, balances.get(addr)!.get(tokenAddr)! - value);
  }
}

export function findBalanceChanges(
  scc: Array<Array<string>>,
  graph: TokenFlowGraph
): Map<string, Map<string, bigint>> {
  const balances: Map<string, Map<string, bigint>> = new Map();
  for (const [from, edges] of graph.adjList) {
    for (const [_, edge] of edges) {
      adjustBalance(edge.value, from, edge.tokenAddress, false, balances);
      adjustBalance(edge.value, edge.toAddr, edge.tokenAddress, true, balances);
    }
  }
  return balances;
}

function mergeBalance(
  addr: string,
  mergedBalance: Map<string, bigint>,
  balanceChanges: Map<string, Map<string, bigint>>
) {
  if (!balanceChanges.has(addr)) {
    return;
  }
  for (const [tokenAddr, value] of balanceChanges.get(addr)!) {
    if (!mergedBalance.has(tokenAddr)) {
      mergedBalance.set(tokenAddr, BigInt(0));
    }
    mergedBalance.set(tokenAddr, mergedBalance.get(tokenAddr)! + value);
  }
}

const mintBurnAddr = "0x0000000000000000000000000000000000000000";

function updateRewardToAddress(
  sender: string,
  receiver: string,
  addr: string,
  rewards: Map<string, bigint>,
  sccMap: Map<string, number>,
  balanceChanges: Map<string, Map<string, bigint>>,
  graph: TokenFlowGraph,
  mintBurnAddrs: Set<string>
) {
  for (const [from, edges] of graph.adjList) {
    for (const [_, edge] of edges) {
      if (addr !== edge.toAddr) {
        continue;
      }
      if (sccMap.get(addr) === sccMap.get(from)) {
        continue;
      }
      if (from === sender || from === receiver || mintBurnAddrs.has(from)) {
        continue;
      }
      if (!balanceChanges.has(from)) {
        continue;
      }
      for (const [tokenAddr, value] of balanceChanges.get(from)!) {
        if (!rewards.has(tokenAddr)) {
          rewards.set(tokenAddr, BigInt(0));
        }
        rewards.set(tokenAddr, rewards.get(tokenAddr)! + value);
      }
    }
  }
}

export function winnerRewards(
  sender: string,
  receiver: string,
  sccs: Array<Array<string>>,
  balanceChanges: Map<string, Map<string, bigint>>,
  graph: TokenFlowGraph,
  mintBurnAddrs: Set<string>,
  chainNativeToken: string,
  feeRecipent: string
): [Map<string, bigint>, Map<string, bigint>] {
  let rewards: Map<string, bigint> = new Map();
  mergeBalance(sender, rewards, balanceChanges);
  mergeBalance(receiver, rewards, balanceChanges);
  let sccMap = graph.getSCCIndex(sccs);
  let cost: Map<string, bigint> = new Map();
  let visited = new Set<string>();
  // travse once to add blacklisted addresses
  for (const [from, edges] of graph.adjList) {
    if (from !== receiver && from !== sender) {
      continue;
    }
    for (const [_, edge] of edges) {
      if (sccMap.get(from) === sccMap.get(edge.toAddr)) {
        continue;
      }
      if (!balanceChanges.has(edge.toAddr)) {
        continue;
      }
      if (
        edge.toAddr == sender ||
        edge.toAddr == receiver ||
        (edge.index !== graph.edgeIndex &&
          edge.tokenAddress !== chainNativeToken)
      ) {
        visited.add(edge.toAddr);
      }
    }
  }
  for (const [from, edges] of graph.adjList) {
    if (from !== receiver && from !== sender) {
      continue;
    }
    for (const [_, edge] of edges) {
      if (sccMap.get(from) === sccMap.get(edge.toAddr)) {
        continue;
      }
      if (!balanceChanges.has(edge.toAddr)) {
        continue;
      }
      if (
        edge.toAddr == sender ||
        edge.toAddr == receiver ||
        (edge.index !== graph.edgeIndex &&
          edge.tokenAddress !== chainNativeToken)
      ) {
        continue;
      }
      if (visited.has(edge.toAddr)) {
        continue;
      }
      visited.add(edge.toAddr);
      if (feeRecipent == edge.toAddr) {
        if (!cost.has(edge.tokenAddress)) {
          cost.set(edge.tokenAddress, BigInt(0));
        }
        cost.set(edge.tokenAddress, cost.get(edge.tokenAddress)! + edge.value);
      }
      for (const [tokenAddr, value] of balanceChanges.get(edge.toAddr)!) {
        if (!rewards.has(tokenAddr)) {
          rewards.set(tokenAddr, BigInt(0));
        }
        rewards.set(tokenAddr, rewards.get(tokenAddr)! + value);
      }
    }
  }
  updateRewardToAddress(
    sender,
    receiver,
    sender,
    rewards,
    sccMap,
    balanceChanges,
    graph,
    mintBurnAddrs
  );
  updateRewardToAddress(
    sender,
    receiver,
    receiver,
    rewards,
    sccMap,
    balanceChanges,
    graph,
    mintBurnAddrs
  );
  return [rewards, cost];
}

// define a enum type
export enum AddressProperty {
  Trader,
  Loser,
  Winner,
  NPC,
}

// Some bots treat USDT , DAI and USDC as the same token
function normalizeToken(token: string): [string, bigint] {
  if (
    token.toLowerCase() ===
    "0xdac17f958d2ee523a2206206994597c13d831ec7".toLowerCase()
  ) {
    return ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 0n];
  }
  if (
    token.toLowerCase() ===
    "0x6B175474E89094C44Da98b954EedeAC495271d0F".toLowerCase()
  ) {
    return ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 12n];
  }
  return [token, 0n];
}

export interface txnResult {
  txnHash: string;
  txnIndex: number;
  txFrom: string;
  mevContract: string;
  revenue: Map<string, bigint>;
  costs: Map<string, bigint>;
  addressProperty: Map<string, AddressProperty>;
  minerPayment: string;
  graph: TokenFlowGraph;
}

export interface sandwichTxnResult {
  frontTxnHash: string;
  frontTxnIndex: number;
  mevContract: string;
  backTxnHash: string;
  backTxnIndex: number;
  revenue: Map<string, bigint>;
  costs: Map<string, bigint>;
  minerPayment: string;
}

export function isSandwich(
  arr: Array<txnResult>
): [boolean, sandwichTxnResult] {
  const front = arr[0];
  const back = arr[arr.length - 1];
  let minerPayment = front.minerPayment;
  if (minerPayment === "") {
    minerPayment = back.minerPayment;
  }
  let ret = {
    frontTxnHash: front.txnHash,
    backTxnHash: back.txnHash,
    frontTxnIndex: front.txnIndex,
    backTxnIndex: back.txnIndex,
    revenue: new Map<string, bigint>(),
    costs: new Map<string, bigint>(),
    mevContract: back.mevContract,
    minerPayment: minerPayment,
  };
  const frontRet = getRolesCount(front.addressProperty);
  const backRet = getRolesCount(back.addressProperty);
  let numFrontTrader = 0;
  let numBackTrader = 0;
  if (
    frontRet.has(AddressProperty.Trader) &&
    frontRet.get(AddressProperty.Trader)! > 0
  ) {
    numFrontTrader = frontRet.get(AddressProperty.Trader)!;
    if (front.addressProperty.get(front.txFrom) === AddressProperty.Trader) {
      numFrontTrader -= 1;
    }
  }
  if (
    backRet.has(AddressProperty.Trader) &&
    backRet.get(AddressProperty.Trader)! > 0
  ) {
    numBackTrader = backRet.get(AddressProperty.Trader)!;
    if (back.addressProperty.get(back.txFrom) === AddressProperty.Trader) {
      numBackTrader -= 1;
    }
  }
  if (numFrontTrader === 0 || numBackTrader === 0) {
    return [false, ret];
  }
  const frontProperty = getProperty("sandwich", front.revenue);
  if (frontProperty === AddressProperty.Winner) {
    return [false, ret];
  }

  // The middle txns should contain at least 1 trader.
  var containsTrader = false;
  for (let i = 1; i < arr.length - 1; i++) {
    const txn = arr[i];
    const txnRet = getRolesCount(txn.addressProperty);
    if (
      txnRet.has(AddressProperty.Trader) &&
      txnRet.get(AddressProperty.Trader)! > 0
    ) {
      containsTrader = true;
      break;
    }
  }
  if (!containsTrader) {
    return [false, ret];
  }

  let revenue = front.revenue;
  let costs = front.costs;
  for (const [address, balance] of front.revenue) {
    const [norm, factor] = normalizeToken(address);
    const scaledBalance = balance.scaleDown(factor);
    if (!revenue.has(norm)) {
      revenue.set(norm, 0n);
    }
    if (norm !== address) {
      revenue.set(norm, revenue.get(norm)! + BigInt(scaledBalance.toFixed(0)));
      revenue.delete(address);
    }
  }

  for (const [address, balance] of back.revenue) {
    const [norm, factor] = normalizeToken(address);
    const scaledBalance = balance.scaleDown(factor);
    if (!revenue.has(norm)) {
      revenue.set(norm, 0n);
    }
    if (revenue.has(norm)) {
      revenue.set(norm, revenue.get(norm)! + BigInt(scaledBalance.toFixed(0)));
    } else {
      revenue.set(norm, BigInt(scaledBalance.toFixed(0)));
    }
  }

  for (const [address, value] of back.costs) {
    if (costs.has(address)) {
      costs.set(address, costs.get(address)! + value);
    } else {
      costs.set(address, value);
    }
  }
  const property = getProperty("sandwich", revenue);
  if (property == AddressProperty.Winner) {
    ret.revenue = revenue;
    ret.costs = costs;

    return [true, ret];
  } else {
    return [false, ret];
  }
}

export function getProperty(
  addr: string,
  ret: Map<string, bigint>
): AddressProperty {
  let numIncrease = 0;
  let numDecrease = 0;

  for (const [_, balance] of ret) {
    if (balance > BigInt(0)) {
      numIncrease++;
    } else if (balance < BigInt(0)) {
      numDecrease++;
    }
  }
  // console.log(addr, numIncrease, numDecrease);
  if (numIncrease > 0 && numDecrease > 0) {
    return AddressProperty.Trader;
  }
  if (numIncrease > 0 && numDecrease === 0) {
    return AddressProperty.Winner;
  }
  if (numIncrease === 0 && numDecrease > 0) {
    return AddressProperty.Loser;
  }
  return AddressProperty.NPC;
}

export function getAddressProperty(
  addresses: Map<string, Map<string, bigint>>
): Map<string, AddressProperty> {
  let addressProperty: Map<string, AddressProperty> = new Map();
  for (const [addr, tokenBalances] of addresses) {
    addressProperty.set(addr, getProperty(addr, tokenBalances));
  }
  return addressProperty;
}

export function getRolesCount(
  addressProperty: Map<string, AddressProperty>
): Map<AddressProperty, number> {
  let rolesCount: Map<AddressProperty, number> = new Map();
  for (const [addr, role] of addressProperty) {
    if (!rolesCount.has(role)) {
      rolesCount.set(role, 0);
    }
    rolesCount.set(role, rolesCount.get(role)! + 1);
  }
  return rolesCount;
}

export function printBalances(
  balanceChanges: Map<string, Map<string, bigint>>
) {
  for (const [addr, tokenBalances] of balanceChanges) {
    for (const [tokenAddr, balance] of tokenBalances) {
      console.log(addr, tokenAddr, balance.toString());
    }
  }
}
