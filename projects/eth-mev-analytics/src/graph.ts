// define a struct for edge
interface Edge {
  readonly tokenAddress: string;
  readonly toAddr: string;
  readonly value: bigint;
  index: number;
}

export class TokenFlowGraph {
  adjList: Map<string, Map<string, Edge>>;
  edgeIndex = 0;

  constructor() {
    this.adjList = new Map<string, Map<string, Edge>>();
  }

  numSCCs(): number {
    return this.findStronglyConnectedComponents().length;
  }

  numNodes(): number {
    let nodes = new Set<string>();
    for (const [from, edges] of this.adjList) {
      nodes.add(from);
      for (const [_, edge] of edges) {
        nodes.add(edge.toAddr);
      }
    }
    return nodes.size;
  }

  getSCCIndex(sccs: Array<Array<string>>): Map<string, number> {
    let sccMap = new Map<string, number>();
    for (let scc of sccs) {
      for (let addr of scc) {
        // set index of scc to addr
        sccMap.set(addr, sccs.indexOf(scc));
      }
    }
    return sccMap;
  }

  addEdge(from: string, edge: Edge, source: string): void {
    from = from.toLowerCase();
    const edgeKey =
      edge.tokenAddress.toLowerCase() + "/" + edge.toAddr.toLowerCase();
    if (!this.adjList.has(from)) {
      this.adjList.set(from, new Map<string, Edge>());
    }
    //  console.log("adding edge", source, from, edgeKey, edge.value);
    if (this.adjList.get(from)!.has(edgeKey)) {
      const oldEdge = this.adjList.get(from)!.get(edgeKey)!;
      this.adjList.get(from)!.set(edgeKey, {
        ...edge,
        value: oldEdge.value + edge.value,
      });
    } else {
      this.edgeIndex++;
      edge.index = this.edgeIndex;
      this.adjList.get(from)!.set(edgeKey, edge);
    }
  }

  connectedTo(from: string, ret: Set<string>) {
    const edges = this.adjList.get(from.toLowerCase());
    if (!edges) {
      return;
    }
    for (const [_, edge] of edges) {
      ret.add(edge.toAddr.toLowerCase());
    }
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

  print() {
    for (const [from, edges] of this.adjList) {
      for (const [_, edge] of edges) {
        console.log("edge:", from, edge.toAddr, edge.tokenAddress, edge.value);
      }
    }
  }
}
