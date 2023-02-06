import { ICFGBlock } from "./cfgBuilder";
import { stringMap } from "./dom";

export const getBackEdges = (cfgBlocks: ICFGBlock[], dominatorMap: stringMap, successorMap: stringMap) => {
  const backEdges: string[][] = [];
  cfgBlocks.forEach((block) => {
    dominatorMap[block.name].forEach((dominator) => {
      if (successorMap[block.name].includes(dominator)) backEdges.push([block.name, dominator]);
    });
  });
  return backEdges;
};

export const getNaturalLoops = (backEdges: string[][], predecessorMap: stringMap) => {
  const recursePredecessors = (tail: string, loop: string[], explored: string[]) => {
    loop.push(tail);
    explored.push(tail);
    if (!predecessorMap[tail]) debugger;
    predecessorMap[tail].forEach((tailPredecessor) => {
      if (!explored.includes(tailPredecessor)) recursePredecessors(tailPredecessor, loop, explored);
    });
  };
  const allLoops: string[][] = [];
  backEdges.forEach(([tail, head]) => {
    const naturalLoop = [head];
    const explored = [head];
    recursePredecessors(tail, naturalLoop, explored);
    allLoops.push(naturalLoop);
  });
  return allLoops;
};

export const getLoopExits = (loops: string[][], successorMap: stringMap) => {
  const exits: string[][] = [];
  loops.forEach((loop, i) => {
    exits[i] = [];
    loop.forEach((blockName) => {
      successorMap[blockName].forEach((nextBlockName) => {
        if (!loop.includes(nextBlockName)) exits[i].push(nextBlockName);
      });
    });
  });
};
