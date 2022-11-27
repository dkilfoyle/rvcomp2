import _ from "lodash";
import { IBrilProgram, IBrilValueInstruction } from "./BrilInterface";
import { addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges, ICFG, ICFGBlock, ICFGBlockMap } from "./cfgBuilder";

interface IDFAnalysis<T> {
  forward: boolean;
  init: T;
  merge: (sets: T[]) => T;
  transfer: (block: ICFGBlock, inout: T) => T;
}

const union = (sets: string[][]) => _.union(...sets);
const intersection = (sets: string[]) => _.intersection(...sets);
const addUnique = (names: string[], name: string) => _.union(name, names);

// vars that have a generated value in this block
const generatedVars = (block: ICFGBlock) => block.instructions.filter((ins) => "dest" in ins).map((ins) => (ins as IBrilValueInstruction).dest);

// vars that are read/used before they are written to in this block
// the values must have been set in an earlier block
const usedVars = (block: ICFGBlock) => {
  const defined: string[] = [];
  const used: string[] = [];
  block.instructions.forEach((instr) => {
    if ("args" in instr) {
      instr.args?.forEach((arg) => {
        if (!defined.includes(arg)) addUnique(used, arg);
      });
    }
    if ("dest" in instr) {
      addUnique(used, instr.dest);
    }
  });
  return used;
};

const ANALYSES: Record<string, IDFAnalysis<any>> = {
  defined: { forward: true, init: [], merge: union, transfer: (block, in_) => _.union(in_, generatedVars(block)) } as IDFAnalysis<string[]>,
  live: {
    forward: false,
    init: [],
    merge: union,
    transfer: (block, out_) => _.union(usedVars(block), _.difference(out_, generatedVars(block))),
  } as IDFAnalysis<string[]>,
};

export const dfWorklist = (blockMap: ICFGBlockMap, analysis: IDFAnalysis<any>) => {
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);

  let firstBlock: ICFGBlock | undefined;
  let inEdges: Record<string, string[]>;
  let outEdges: Record<string, string[]>;
  if (analysis.forward) {
    firstBlock = _.first(Object.values(blockMap));
    inEdges = predecessorsMap;
    outEdges = successorsMap;
  } else {
    firstBlock = _.last(Object.values(blockMap));
    inEdges = successorsMap;
    outEdges = predecessorsMap;
  }

  const _in: Record<string, any> = { firstBlock: analysis.init };
  const _out: Record<string, any> = Object.keys(blockMap).reduce((accum: Record<string, any>, name) => {
    accum[name] = analysis.init;
    return accum;
  }, {});

  if (firstBlock) {
    const worklist = Object.keys(blockMap);
    while (worklist.length > 0) {
      const blockName = worklist.shift()!;

      // merge all the outputs of the incoming edges into 1 array
      const feederBlocks = inEdges[blockName] || [];
      const mergedin = analysis.merge(feederBlocks.map((incomingBlockName) => _out[incomingBlockName]));
      _in[blockName] = mergedin;

      const transferResult = analysis.transfer(blockMap[blockName], mergedin);

      if (!_.isEqual(transferResult, _out[blockName])) {
        _out[blockName] = transferResult;
        if (outEdges[blockName]) worklist.push(...outEdges[blockName]);
      }
    }
  }

  if (analysis.forward) return { _in, _out };
  else return { _in: _out, _out: _in };
};

export const runDataFlow = (bril: IBrilProgram, analysis: string) => {
  const cfg = cfgBuilder.buildProgram(bril);
  Object.keys(cfg).forEach((fnName) => {
    const dfBlockMap = getCfgBlockMap(cfg[fnName]);
    addCfgTerminators(dfBlockMap);

    const { _in, _out } = dfWorklist(dfBlockMap, ANALYSES[analysis]);
    console.log(`${fnName}: `, _in, _out);
  });
};
