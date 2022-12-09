import _ from "lodash";
import { ICFGBlock } from "./cfgBuilder";

export type stringMap = Record<string, string[]>;

export const invertMap = (inmap: stringMap) => {
  const out: stringMap = {};
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

const postOrderVisitor = (successorsMap: stringMap, rootName: string, explored: string[], out: string[]) => {
  // traverse down the tree from root to last node
  // add nodes to out on recursive return back up
  // don't traverse if already explored
  if (explored.includes(rootName)) return;
  // mark this branch as explored
  explored = _.union(explored, [rootName]);
  // visit each child
  successorsMap[rootName].forEach((successor) => postOrderVisitor(successorsMap, successor, explored, out));
  out.push(rootName);
};

export const postOrder = (successorsMap: stringMap, rootName: string) => {
  const out: string[] = [];
  const explored: string[] = [];
  postOrderVisitor(successorsMap, rootName, explored, out);
  return out;
};

export const getDominatorMap = (successorsMap: stringMap, entryName: string) => {
  // returns { blockName: [blocks that are in EVERY path from entry to blockName]}
  const predecessorsMap = invertMap(successorsMap);
  const nodes = postOrder(successorsMap, entryName).reverse();
  const dom: stringMap = {};
  // init every node to reverse postorder
  Object.keys(successorsMap).forEach((v) => {
    dom[v] = nodes;
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

export const getDominanceFrontierMap = (dominatorMap: stringMap, successorsMap: stringMap) => {
  // the list of nodes 1 step outside the furthest node dominated by x
  // DF(N) = set of blocks that are not dominated by N and which are first reached on paths from N
  // {succcesor([dominated by N]) && !dominated by N}
  // for each block, find the list of blocks that are dominated by this block but
  const dom_inv = invertMap(dominatorMap);
  const frontiers: stringMap = {};
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

export const getDominanceTree = (dominatorMap: stringMap) => {
  // get the blocks strictly dominated by a block
  // dom_inv = what blocks does this block dominate
  const dom_inv = invertMap(dominatorMap);
  const dom_inv_strict: stringMap = {};
  const dom_inv_strict2: stringMap = {};
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

  const res: stringMap = {};
  Object.entries(dom_inv_strict).forEach(([a, bs]) => {
    res[a] = bs.filter((b) => !dom_inv_strict2[a].includes(b));
  });

  return res;
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
