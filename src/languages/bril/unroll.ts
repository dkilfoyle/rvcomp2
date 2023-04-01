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

const getInitialValue = (nodes: string[], predecessors: string[], constsOut: Record<string, IStringMap>, indVarName: string) => {
  const initVal = new Set();
  predecessors.forEach((pred) => {
    // for each predecessor block of the loop entry block
    if (!nodes.includes(pred)) {
      const predConsts = constsOut[pred];
      if (predConsts[indVarName] != "?") initVal.add(Number(predConsts[indVarName]));
    }
  });
  if (initVal.size != 1) return undefined;
  return Number(Array.from(initVal)[0]);
};

const getStepSize = (nodes: string[], blockMap: ICFGBlockMap, constsIn: Record<string, IStringMap>, indVarName: string) => {
  // find all the instructions in the loop that change the induction var in the form i=i+/-n
  const indVarUpdates: { updateInstr: IBrilValueOperation; updateBlock: string }[] = [];
  nodes.forEach((node) =>
    blockMap[node].instructions.forEach((instr) => {
      if (!(instr.op == "const"))
        if ("dest" in instr && instr.dest == indVarName && ["add", "sub"].includes(instr.op) && instr.args.includes(instr.dest))
          indVarUpdates.push({ updateInstr: instr as IBrilValueOperation, updateBlock: node });
    })
  );

  if (indVarUpdates.length != 1) {
    console.log("!! Inductionn var update is not in form i=i+n");
    return undefined;
  }
  const { updateInstr, updateBlock } = indVarUpdates[0];
  console.log(`Found induction var update instruction in block ${updateBlock}`, updateInstr);

  // get step size
  let step = undefined;
  updateInstr.args.forEach((arg) => {
    if (arg != indVarName) {
      const cp = constsIn[updateBlock];
      if (arg in cp && cp[arg] != "?") step = Number(cp[arg]);
    }
  });

  if (!step) {
    console.log("!! Induction var update step not defined in copy propogation");
    return undefined;
  }

  return step * (updateInstr.op == "sub" ? -1 : 1);
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
  console.log(`Found br instruction with condVar = ${br.args![0]}`, br);

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
  console.log(`Found induction variable ${indVarName}, lt bound = ${boundValue}`);

  // find the initial value of induction var
  // eg i:int = const 0    or i:int = id x (where x chains to a const)
  const initVal = getInitialValue(loop, predecessorsMap[loop[0]], constsOut, indVarName);
  if (_.isUndefined(initVal)) {
    console.log("!! Unable to find induction var initial value");
    return undefined;
  }
  console.log(`Found induction var ${indVarName} inital value = ${initVal}`);

  const step = getStepSize(loop, blockMap, constsIn, indVarName);
  if (_.isUndefined(step)) {
    console.log("!! Cannot determine step size");
    return undefined;
  }
  console.log(`Step size = ${step}`);

  return (boundValue - initVal + step - 1) / step;
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

const unrollLoop = (blockMap: ICFGBlockMap, successorsMap: IStringsMap, loop: string[], iLoop: number, tripCount: number) => {
  const newBlocks: ICFGBlockMap = {};
  // copy all non loop blocks to new blocks
  for (let bb in blockMap) {
    if (!loop.includes(bb)) newBlocks[bb] = _.cloneDeep(blockMap[bb]);
  }

  const entry = _.first(loop)!;
  const exit = _.last(loop)!;
  const exitFromExit = false; // SimpleC only has while do, no do while
  console.log(`Unrolling loop #${iLoop}: ${entry} => ${exit}, tripCount = ${tripCount}`);

  // change targets of other blocks that might jump to the loop entry
  // and instead jump to L[n]_0_entry
  Object.entries(newBlocks).forEach(([blockName, block]) => {
    let rawBlockName = blockName.includes("_") ? _.last(blockName.split("_"))! : blockName;
    if (successorsMap[rawBlockName].includes(entry)) {
      const termInstr = block.instructions.at(-1);
      if (!termInstr) throw Error("block before loop entry has 0 instructions");
      if (termInstr.op == "jmp") termInstr.labels![0]! = `L${iLoop}_0_${entry}`;
      else if (termInstr.op == "br") {
        for (let i = 0; i < termInstr.labels!.length; i++) {
          if (termInstr.labels![i] == entry) termInstr.labels![i] = `L${iLoop}_0_${entry}`;
        }
      }
    }
  });

  const loopBlocks: ICFGBlockMap = {};
  // duplicate blocks in loop
  for (let i = 0; i < tripCount; i++) {
    loop.forEach((bb) => {
      const newBlock = _.cloneDeep(blockMap[bb]);
      newBlock.name = `L${iLoop}_${i}_${bb}`;
      if (newBlock.instructions.length) {
        const termInstr = newBlock.instructions.at(-1)!;
        // change jmps to targets inside loop or exit block
        if (termInstr.op == "jmp") {
          if (!termInstr.labels) throw Error("badly formed IR, jmp should have target");
          const target = termInstr.labels[0];
          if (target == entry)
            termInstr.labels[0] = `L${iLoop}_${i + 1}_${entry}`; // backedge should now instead jump to the next unrolled block
          else if (loop.includes(target)) termInstr.labels[0] = `L${iLoop}_${i}_${target}`; // jmps internal to loop jmp within numbered unroll block
        } else if (termInstr.op == "br") {
          if (!termInstr.labels) throw Error("badly formed IR, jmp should have target");
          const targets = termInstr.labels.slice(0);
          const inLoop = targets.map((t) => loop.includes(t));
          if (inLoop[0] && !inLoop[1]) {
            // first arg is in loop
            termInstr.op = "jmp";
            delete termInstr.args;
            if (targets[0] == entry) termInstr.labels = [`L${iLoop}_${i + 1}_${entry}`];
            else termInstr.labels = [`L${iLoop}_${i}_${targets[0]}`];
          } else {
            // both args in loop
            for (let j = 0; j < termInstr.labels.length; j++) {
              termInstr.labels[j] = `L${iLoop}_${i}_${termInstr.labels[j]}`;
            }
          }
        }
      }
      console.log(` - Adding block ${newBlock.name}, final instruction: `, newBlock.instructions.at(-1));
      loopBlocks[newBlock.name] = newBlock;
    });
  }

  if (!exitFromExit) {
    // need to add an extra entry block
    const newBlock = _.cloneDeep(blockMap[entry]);
    newBlock.name = `L${iLoop}_${tripCount}_${entry}`;
    const brInstr = newBlock.instructions.at(-1)!;
    if (brInstr.op == "br") {
      brInstr.op = "jmp";
      delete brInstr.args;
      brInstr.labels = [brInstr.labels![1]];
    }
    loopBlocks[newBlock.name] = newBlock;
    console.log(` - Adding entry block ${newBlock.name}, last instruction: `, newBlock.instructions.at(-1));
  } else {
    throw Error("exit from exit not supported - no do while loops in SimpleC");
  }

  // for (let i = 0; i < tripCount + 1; i++) {
  //   const exitBlockName = `L${iLoop}_${i}_${exit}`;
  //   if (exitBlockName in loopBlocks) {
  //     delete loopBlocks[exitBlockName];
  //     if (!exitFromExit || i < tripCount - 1) loopBlocks[exitBlockName];
  //   }
  // }

  return { ...newBlocks, ...loopBlocks };
};

export const unrollLoops = (func: IBrilFunction, blockMap: ICFGBlockMap) => {
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

  const stats = {
    unrolledLoops: 0,
  };

  for (let iLoop = 0; iLoop < loops.length; iLoop++) {
    const loop = loops[iLoop];
    console.group(`Loop iLoop=${iLoop}: ${loop[0]} => ${_.last(loop)}`);
    const tripCount = getTripCount(loop, predecessorsMap, successorsMap, constsIn, constsOuts, reachingIn, reachingOut, blockMap);

    if (!tripCount || !checkTripCount(loop, blockMap, tripCount)) {
      console.log(`!! Trip count fail, tripCount = ${tripCount}`);
      console.groupEnd();
      break;
    }
    console.log(`Trip count = ${tripCount}`);

    // do unroll
    stats.unrolledLoops++;
    blockMap = unrollLoop(blockMap, successorsMap, loop, iLoop, tripCount);

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

  return { blockMap, stats };
};
