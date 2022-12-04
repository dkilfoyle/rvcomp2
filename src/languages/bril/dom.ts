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
