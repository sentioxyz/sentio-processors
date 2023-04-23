// define a struct for edge
interface Edge {
  readonly tokenAddress: string;
  readonly toAddr: string;
  readonly value: bigint;
}

export class TokenFlowGraph {
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

  findBalanceChanges(
    receiver: string,
    scc: Array<Array<string>>
  ): Map<string, Map<string, bigint>> {
    const balances: Map<string, Map<string, bigint>> = new Map();
    let component: Set<string> = new Set();
    receiver = receiver.toLowerCase();
    console.log("scc", scc.length, receiver);
    for (const sccComponent of scc) {
      if (sccComponent.includes(receiver)) {
        for (const addr of sccComponent) {
          component.add(addr);
        }
        break;
      }
    }
    console.log("component", component.size);
    for (const [fromAddr, v] of this.adjList) {
      if (!component.has(fromAddr)) {
        console.log("not in component", fromAddr);
        continue;
      }
      if (!balances.has(fromAddr)) {
        balances.set(fromAddr, new Map());
      }
      for (const edge of v.values()) {
        if (!component.has(edge.toAddr)) {
          console.log("not in component", edge.toAddr);
          continue;
        }
        const toAddr = edge.toAddr;
        const tokenAddr = edge.tokenAddress;
        if (!balances.has(toAddr)) {
          balances.set(toAddr, new Map());
        }
        if (!balances.get(fromAddr)!.has(tokenAddr)) {
          balances.get(fromAddr)!.set(tokenAddr, BigInt(0));
        }
        if (!balances.get(toAddr)!.has(tokenAddr)) {
          balances.get(toAddr)!.set(tokenAddr, BigInt(0));
        }
        balances
          .get(fromAddr)!
          .set(tokenAddr, balances.get(fromAddr)!.get(tokenAddr)! - edge.value);
        balances
          .get(toAddr)!
          .set(tokenAddr, balances.get(toAddr)!.get(tokenAddr)! + edge.value);
      }
    }
    return balances;
  }

  findStronglyConnectedComponents(): Array<Array<string>> {
    let index = 0;
    const stack: string[] = [];
    const indices: Map<string, number> = new Map();
    const lowlink: Map<string, number> = new Map();
    const onStack: Map<string, boolean> = new Map();
    const sccs: Array<Array<string>> = [];

    const strongConnect = (v: string) => {
      indices.set(v, index);
      lowlink.set(v, index);
      index++;
      stack.push(v);
      onStack.set(v, true);

      const edges = this.adjList.get(v);
      if (edges) {
        for (const edgeKey of edges.keys()) {
          const w = edges.get(edgeKey)!.toAddr.toLowerCase();
          if (!indices.has(w)) {
            strongConnect(w);
            lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
          } else if (onStack.get(w)) {
            lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
          }
        }
      }

      if (lowlink.get(v) === indices.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };

    for (const v of this.adjList.keys()) {
      if (!indices.has(v)) {
        strongConnect(v);
      }
    }

    return sccs;
  }
}
