import _ from "lodash";
import { IBrilProgram, IBrilValueInstruction } from "./BrilInterface";
import { addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges, ICFG, ICFGBlock, ICFGBlockMap } from "./cfgBuilder";

interface IDFAnalysis<T> {
  forward: boolean;
  init: T;
  merge: (sets: T[]) => T; // merge together the outputs of the incoming edges
  transfer: (block: ICFGBlock, inout: T) => T; // process the merged inputs to produce an output
}

const union = (sets: string[][]) => _.union(...sets);
// const intersection = (sets: string[]) => _.intersection(...sets);
// const addUnique = (names: string[], name: string) => _.union(name, names);

// vars that have a generated value in this block
const generatedVars = (block: ICFGBlock) => block.instructions.filter((ins) => "dest" in ins).map((ins) => (ins as IBrilValueInstruction).dest);

// vars that are read/used before they are written to in this block
// the values must have been set in an earlier block
const usedVars = (block: ICFGBlock) => {
  let defined: string[] = [];
  let used: string[] = [];
  block.instructions.forEach((instr) => {
    if ("args" in instr) {
      instr.args?.forEach((arg) => {
        if (!defined.includes(arg)) used = _.union(used, [arg]);
      });
    }
    if ("dest" in instr) {
      defined = _.union(defined, [instr.dest]);
    }
  });
  return used;
};

const cprop_transfer = (block: ICFGBlock, in_: Record<string, string>) => {
  const _out: Record<string, string> = { ...in_ };
  block.instructions.forEach((instr) => {
    if ("dest" in instr) {
      if (instr.op == "const") _out[instr.dest] = instr.value.toString();
      else _out[instr.dest] = "?";
    }
  });
  return _out;
};

const cprop_merge = (inputs: Record<string, string>[]) => {
  const merged: Record<string, string> = {};
  inputs.forEach((input) => {
    Object.entries(input).forEach(([varName, varValue]) => {
      if (varValue == "?") merged[varName] = "?";
      else {
        if (Object.keys(merged).includes(varName)) {
          if (merged[varName] != varValue) merged[varName] = "?"; // already exists and overwriting with new value
        } else merged[varName] = varValue;
      }
    });
  });
  return merged;
};

const ANALYSES: Record<string, IDFAnalysis<any>> = {
  defined: { forward: true, init: [], merge: union, transfer: (block, in_) => _.union(in_, generatedVars(block)) } as IDFAnalysis<string[]>,
  live: {
    forward: false,
    init: [],
    merge: union,
    transfer: (block, out_) => _.union(usedVars(block), _.difference(out_, generatedVars(block))),
  } as IDFAnalysis<string[]>,
  cprop: {
    forward: true,
    init: {},
    merge: cprop_merge,
    transfer: cprop_transfer,
  } as IDFAnalysis<Record<string, string>>,
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

export const getDataFlow = (blockMap: ICFGBlockMap) => {
  const { _in: definedIn, _out: definedOut } = dfWorklist(blockMap, ANALYSES["defined"]);
  const { _in: liveIn, _out: liveOut } = dfWorklist(blockMap, ANALYSES["live"]);
  const { _in: cpropIn, _out: cpropOut } = dfWorklist(blockMap, ANALYSES["cprop"]);
  return {
    definedIn: definedIn as Record<string, string[]>,
    definedOut: definedOut as Record<string, string[]>,
    liveIn: liveIn as Record<string, string[]>,
    liveOut: liveOut as Record<string, string[]>,
    cpropIn: cpropIn as Record<string, Record<string, string>>,
    cpropOut: cpropOut as Record<string, Record<string, string>>,
  };
};
