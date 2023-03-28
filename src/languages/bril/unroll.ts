// adapted from https://github.com/seanlatias/bril

import _ from "lodash";
import { IBrilEffectOperation, IBrilFunction, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
import { ICFGBlockMap, getCfgEdges } from "./cfg";
import { dfWorklist, ANALYSES } from "./df";
import { getDominatorMap, IStringsMap, IStringMap } from "./dom";
import { getBackEdges, getNaturalLoops, getLoopExits, findLoopInvariants, getBasicInductionVars } from "./loops";

const checkLoop = (loop: string[], successors: IStringsMap) => {
  const entry = _.first(loop);
  const exit = _.last(loop);

  // SimpleC only produces regular loops so these checks are not required
  // SimpleC doesn't have do-while loops so endLoop block is always an edge from the entry
  return true;

  // exit should be the only loop exit
  // check for outgoing edges in nodes inbetween entry and exit
  // for (const bb of loop) {
  //   if (!(bb == entry || bb == exit)) {
  //     for (const successor of successors[bb]) {
  //       if (!loop.includes(successor)) {
  //         console.log(`${bb} exits to ${successor} which is outside loop ${entry} => ${exit}`);
  //         // SimpleC only produces regular loops so this shouldn't happen
  //         return false;
  //       }
  //     }
  //   }
  // }

  // entry should have exits only from either entry or exit
  //   exit_pos = {'entry': False, 'exit': False}
  // counts = {'entry': 0, 'exit': 0}
  // for bb_key in ['entry', 'exit']:
  //   bb = loop[bb_key]
  //   for successor in succs[bb]:
  //     if not successor in loop['nodes']:
  //       exit_pos[bb_key] = True
  //       counts[bb_key] += 1

  // # add a flag to indicate the exit position
  // loop['exit_from_exit'] = exit_pos['exit']

  // # condition to check whether the loop is interesting or not
  // is_valid = not(exit_pos['entry'] and exit_pos['exit'])
  // is_valid = is_valid or (counts['entry'] != 1) or (counts['exit'] != 1)
};

const filterInnermostLoops = (loops: string[][]) => {
  const isSuperSet = (set: Set<string>, subset: Set<string>) => {
    // if the set does not have it then its not a superset
    for (let e of subset) {
      if (!set.has(e)) return false;
    }
    return true;
  };

  const removeList: number[] = [];
  for (let i = 0; i < loops.length; i++) {
    for (let j = 0; j < loops.length; j++) {
      if (!(i == j)) {
        const set1 = new Set(loops[i]);
        const set2 = new Set(loops[i]);
        if (isSuperSet(set1, set2)) {
          removeList.push(i);
          break;
        }
      }
    }
  }

  return loops.filter((loop, i) => {
    return !removeList.includes(i);
  });
};

const getLoopEndTarget = (loop: string[], successorMap: IStringsMap) => {
  const entry = _.first(loop);
  const exit = _.last(loop);
  const nodes = loop.slice(1, -1);

  const entrySucessors = successorMap[_.first(loop)!];
  const target = entrySucessors.find((node) => !nodes.includes(node));
  if (!target) throw Error("unable to find loop end target");
  return target;
};

const getLoopConditionInstruction = (
  blockMap: ICFGBlockMap,
  nodes: string[],
  source: string,
  br: IBrilEffectOperation,
  rdSource: IStringsMap
) => {
  // br condVar whileLoop whileExit
  // find the instruction condVar:bool = lt .. ..
  if (!br.args) throw Error();
  const condVar = br.args[0];

  // count number of reaching definitions of condVar from inside the loop
  // there should be only 1 which is from the source block itself
  let rdCount = 0;
  let condVarReachingDef: { reachingVar: string; originBlock: string } = { reachingVar: "", originBlock: "" };

  Object.entries(rdSource).forEach(([reachingVar, reachingVarOrigins]) => {
    if (reachingVar == condVar && nodes.includes(reachingVarOrigins[0])) {
      rdCount++;
      condVarReachingDef = { reachingVar, originBlock: reachingVarOrigins[0] };
    }
  });
  if (rdCount != 1) return undefined;

  // get the instruction that sets condVar ie condVar:bool = lt x y
  const condInstr = [...blockMap[condVarReachingDef!.originBlock].instructions].reverse().find((instr) => {
    if ("dest" in instr && instr.dest == condVarReachingDef.reachingVar) return instr;
  });
  if (!condInstr) throw Error("Unable to find loop condition");

  if (condInstr.op !== "lt") return undefined;

  return { condInstr, condInstrBlock: condVarReachingDef.originBlock };
};

const getInductionVariable = (condInstr: IBrilValueOperation, constsIn: IStringMap) => {
  // test:bool = lt i c10
  // induction var = i
  // bound var = c10
  let boundValue = undefined;
  const boundArg = condInstr.args[1];
  if (boundArg in constsIn && constsIn[boundArg] != "?") boundValue = Number(constsIn[boundArg]);

  const indVarName = !_.isUndefined(boundValue) ? condInstr.args[0] : undefined;
  return { indVarName, boundValue };
};

const getTripCount = (
  loop: string[],
  predecessorsMap: IStringsMap,
  successorsMap: IStringsMap,
  constsIn: Record<string, IStringMap>,
  constsOut: Record<string, IStringMap>,
  reachingIn: Record<string, IStringsMap>,
  reachingOut: Record<string, IStringsMap>,
  blockMap: ICFGBlockMap
) => {
  const target = getLoopEndTarget(loop, successorsMap);
  const source = loop[0]; // jump to loop end from loop entry (while loop) - do while with jump from exit not supported
  console.log(`Outgoing edge ${source} => ${target}`);

  // Find the loop test br
  // eg br test whilebody whileexit
  const br = blockMap[source].instructions.at(-1);
  if (!(br && "op" in br && br.op == "br")) {
    throw Error(`Expect br instr at end of ${source}`);
  }
  console.log(`Found br instruction with condVar ${br.args![0]}`, br);

  // find the instruction that defines the loop condition var
  // eg test:bool = lt i 10
  const cond = getLoopConditionInstruction(blockMap, loop, source, br, reachingIn[source]);
  if (!cond) {
    console.log("!! No valid condition"); // only lt conditions and condvar must not be redefined within the loop
    return undefined;
  }
  const { condInstr, condInstrBlock } = cond;
  console.log(`Found condVar ${condInstr.dest} definition in block ${condInstrBlock}`, condInstr);

  // get the induction variable and loop bound
  const { indVarName, boundValue } = getInductionVariable(condInstr, constsIn[condInstrBlock]);
  if (!indVarName) {
    console.log("!! Cannot find induction variable");
    return undefined;
  }
  if (!boundValue) {
    console.log("!! Cannot determine loop bound");
    return undefined;
  }
  console.log(`Found induction variable ${indVarName}, lt bound is ${boundValue}`);

  return 0;
};

const checkTripCount = (loop: string[], blockMap: ICFGBlockMap, tripCount: number | undefined) => {
  if (_.isUndefined(tripCount)) return false;
  if (tripCount <= 0) return false;
  let totalInstrs = 0;
  for (let n of loop) {
    totalInstrs += blockMap[n].instructions.length;
  }
  return tripCount * totalInstrs < 1024;
};

export const unroll = (func: IBrilFunction, blockMap: ICFGBlockMap) => {
  const blocks = Object.values(blockMap);
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
  const dominatorMap = getDominatorMap(successorsMap, Object.keys(blockMap)[0]);
  const { _in: constsIn, _out: constsOuts } = dfWorklist<IStringMap>(blockMap, ANALYSES["cprop"]);
  const { _in: reachingIn, _out: reachingOut } = dfWorklist<IStringsMap>(blockMap, ANALYSES["reaching"]);

  const backEdges = getBackEdges(blocks, dominatorMap, successorsMap);
  let loops = getNaturalLoops(backEdges, predecessorsMap);
  loops = loops.filter((loop) => checkLoop(loop, successorsMap));
  loops = filterInnermostLoops(loops);
  const exits = getLoopExits(loops, successorsMap);

  console.group("Unroll");
  console.log("naturalLoops", loops);

  // const invariants = findLoopInvariants(blockMap, loops, reachingIn);
  // console.log("Invariants: ", invariants);

  for (let loop of loops) {
    console.group(`Loop ${loop[0]} => ${_.last(loop)}`);
    const tripCount = getTripCount(loop, predecessorsMap, successorsMap, constsIn, constsOuts, reachingIn, reachingOut, blockMap);

    if (!checkTripCount(loop, blockMap, tripCount)) {
      console.log(`Trip count fail, tripCount = ${tripCount}`);
      console.groupEnd();
      break;
    }

    // const liInstructions = _.flatten(Object.values(invariants[iLoop]));
    // const basicInductionVars = getBasicInductionVars(blockMap, loops[iLoop], liInstructions);
    // console.log("liInstructions", liInstructions);
    // console.log("basicInductionVars", basicInductionVars);

    // only 1 induction variable which is updated by addition or subtraction
    // loop condition should be lt with induction variable as first arg ie test:bool = lt i c5;
    // loop on true, exit on false ie br test doloop endloop
    // copy propogation already done
    // no embedded loops
    console.groupEnd();
  }

  console.groupEnd();

  return {};
};
