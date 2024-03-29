import _ from "lodash";
import { ICFGBlock } from "./cfg";

export type IStringsMap = Record<string, string[]>;
export type IStringMap = Record<string, string>;

export const invertMap = (inmap: IStringsMap) => {
  const out: IStringsMap = {};
  Object.keys(inmap).forEach((key) => {
    out[key] = [];
  });
  Object.entries(inmap).forEach(([key, value]) => {
    value.forEach((v) => {
      if (!out[v]) out[v] = [];
      out[v].push(key);
    });
  });
  return out;
};

const postOrderVisitor = (successorsMap: IStringsMap, rootName: string, explored: string[], out: string[]) => {
  // traverse down the tree from root to last node
  // add nodes to out on recursive return back up
  // don't traverse if already explored
  if (explored.includes(rootName)) return;
  // mark this branch as explored
  explored.splice(0, explored.length, ..._.union(explored, [rootName]));
  // visit each child
  successorsMap[rootName].forEach((successor) => postOrderVisitor(successorsMap, successor, explored, out));
  out.push(rootName);
};

export const postOrder = (successorsMap: IStringsMap, rootName: string) => {
  const out: string[] = [];
  const explored: string[] = [];
  postOrderVisitor(successorsMap, rootName, explored, out);
  return out;
};

export const getDominatorMap = (successorsMap: IStringsMap, entryName: string) => {
  // returns { blockName: [blocks that are in EVERY path from entry to blockName]}
  const predecessorsMap = invertMap(successorsMap);
  const nodes = postOrder(successorsMap, entryName).reverse();
  const dom: IStringsMap = {};
  // init every node to reverse postorder
  Object.keys(successorsMap).forEach((v) => {
    dom[v] = [...nodes];
  });
  while (true) {
    let changed = false;
    nodes.forEach((node) => {
      const newDom = _.intersection(...predecessorsMap[node].map((p) => dom[p]));
      newDom.push(node);
      if (!_.isEqual(dom[node], newDom)) {
        dom[node] = newDom;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return dom;
};

export const getDominanceFrontierMap = (dominatorMap: IStringsMap, successorsMap: IStringsMap) => {
  // the list of nodes 1 step outside the furthest node dominated by x
  // DF(N) = set of blocks that are not dominated by N and which are first reached on paths from N
  // {succcesor([dominated by N]) && !dominated by N}
  // for each block, find the list of blocks that are dominated by this block but
  const dom_inv = invertMap(dominatorMap);
  const frontiers: IStringsMap = {};
  Object.keys(dominatorMap).forEach((blockName) => {
    // find the list of blocks in the dominance frontier of blockName
    let dominated_succs: string[] = [];
    dom_inv[blockName].forEach((dominatedBlock) => {
      dominated_succs = _.union(dominated_succs, successorsMap[dominatedBlock]);
    });
    // in the frontier if not strictly dominated by the current block
    frontiers[blockName] = dominated_succs.filter((b) => b == blockName || !dom_inv[blockName].includes(b));
  });
  return frontiers;
};

export const getDominanceTree = (dominatorMap: IStringsMap) => {
  // get the blocks strictly dominated by a block
  // dom_inv = what blocks does this block dominate
  const dom_inv = invertMap(dominatorMap);
  const dom_inv_strict: IStringsMap = {};
  const dom_inv_strict2: IStringsMap = {};
  Object.entries(dom_inv).forEach(([key, values]) => {
    dom_inv_strict[key] = values.filter((v) => v != key);
  });

  Object.entries(dom_inv_strict).forEach(([a, bs]) => {
    dom_inv_strict2[a] = _.union(
      ...Object.entries(dom_inv_strict)
        .filter(([b, cs]) => bs.includes(b))
        .map(([b, cs]) => cs)
    );
  });

  const res: IStringsMap = {};
  Object.entries(dom_inv_strict).forEach(([a, bs]) => {
    res[a] = bs.filter((b) => !dom_inv_strict2[a].includes(b));
  });

  return res;
};

export const findCommonDescendent = (successorMap: IStringsMap, backEdges: string[][], a: string, b: string) => {
  // a common descdent will be a node reached by both a and b
  if (a == b) return a;
  for (let bChild of successorMap[b]) {
    if (!backEdges.find(([tail, head]) => tail == b && head == bChild)) {
      const match: string = findCommonDescendent(successorMap, backEdges, a, bChild);
      if (match != "") return match;
    }
  }
  for (let aChild of successorMap[a]) {
    if (!backEdges.find(([tail, head]) => tail == a && head == aChild)) {
      const match: string = findCommonDescendent(successorMap, backEdges, aChild, b);
      if (match != "") return match;
    }
  }
  return "";
};

export const findCommonSuccessor = (successorMap: IStringsMap, backEdges: string[][], a: string, b: string) => {
  const getSuccessors = (node: string, successors: string[]) => {
    successorMap[node].forEach((successorName) => {
      if (!backEdges.find(([tail, head]) => tail == node && head == successorName)) {
        successors.push(successorName);
        getSuccessors(successorName, successors);
      }
    });
  };

  const aSuccessors: string[] = [];
  getSuccessors(a, aSuccessors);
  const bSuccessors: string[] = [];
  getSuccessors(b, bSuccessors);

  const abIntersection = _.intersection(aSuccessors, bSuccessors);
  // console.log("findCommonSucessor", a, b, abIntersection);

  if (abIntersection.length > 0) return abIntersection[0];
  else return "";
};

// def dom_tree(dom):
//     # Get the blocks strictly dominated by a block strictly dominated by
//     # a given block.
//     dom_inv = map_inv(dom)
//     dom_inv_strict = {a: {b for b in bs if b != a}
//                       for a, bs in dom_inv.items()}
//     dom_inv_strict_2x = {a: set().union(*(dom_inv_strict[b] for b in bs))
//                          for a, bs in dom_inv_strict.items()}
//     return {
//         a: {b for b in bs if b not in dom_inv_strict_2x[a]}
//         for a, bs in dom_inv_strict.items()
//     }
