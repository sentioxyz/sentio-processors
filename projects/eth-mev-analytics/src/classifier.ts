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
  graph: TokenFlowGraph
) {
  for (const [from, edges] of graph.adjList) {
    for (const [_, edge] of edges) {
      if (addr !== edge.toAddr) {
        continue;
      }
      if (sccMap.get(addr) === sccMap.get(from)) {
        continue;
      }
      if (from == sender || from == receiver || from == mintBurnAddr) {
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
  feeRecipent: string
): [Map<string, bigint>, Map<string, bigint>] {
  let rewards: Map<string, bigint> = new Map();
  mergeBalance(sender, rewards, balanceChanges);
  mergeBalance(receiver, rewards, balanceChanges);
  let sccMap = new Map<string, number>();
  for (let scc of sccs) {
    for (let addr of scc) {
      // set index of scc to addr
      sccMap.set(addr, sccs.indexOf(scc));
    }
  }
  let cost: Map<string, bigint> = new Map();
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
        edge.toAddr == mintBurnAddr
      ) {
        continue;
      }
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
    graph
  );
  updateRewardToAddress(
    sender,
    receiver,
    receiver,
    rewards,
    sccMap,
    balanceChanges,
    graph
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
function normalizeToken(token: string): string {
  if (token === "0xdac17f958d2ee523a2206206994597c13d831ec7") {
    return "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  }
  if (token === "0x6B175474E89094C44Da98b954EedeAC495271d0F") {
    return "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  }
  return token;
}

export function getProperty(
  addr: string,
  ret: Map<string, bigint>,
  normalize: boolean
): AddressProperty {
  let numIncrease = 0;
  let numDecrease = 0;
  let normalizedBalance = new Map<string, bigint>();
  if (!normalize) {
    normalizedBalance = ret;
  } else {
    for (const [tokenAddr, balance] of ret) {
      const norm = normalizeToken(tokenAddr);
      if (!normalizedBalance.has(norm)) {
        normalizedBalance.set(norm, BigInt(0));
      }
      normalizedBalance.set(norm, normalizedBalance.get(norm)! + balance);
    }
  }

  for (const [_, balance] of normalizedBalance) {
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
    addressProperty.set(addr, getProperty(addr, tokenBalances, false));
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
