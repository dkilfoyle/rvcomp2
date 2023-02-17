// Loop invariant code:
// https://www.cs.cornell.edu/courses/cs6120/2019fa/blog/loop-reduction/
// https://github.com/neiladit/bril/blob/master/SR_LICM/funcs.py
// https://github.com/dz333/bril/blob/master/bril-ts/bril-induction-var-elim.ts - currently based off this one

import { create } from "domain";
import _ from "lodash";
import { brilBuilder } from "./BrilBuilder";
import { IBrilEffectOperation, IBrilFunction, IBrilInstruction, IBrilValueInstruction } from "./BrilInterface";
import { getCfgEdges, ICFGBlock, ICFGBlockMap } from "./cfg";
import { ANALYSES, dfWorklist } from "./df";
import { getDominatorMap, IStringsMap } from "./dom";

export const getBackEdges = (cfgBlocks: ICFGBlock[], dominatorMap: IStringsMap, successorMap: IStringsMap) => {
  const backEdges: string[][] = [];
  cfgBlocks.forEach((block) => {
    dominatorMap[block.name].forEach((dominator) => {
      if (successorMap[block.name].includes(dominator)) backEdges.push([block.name, dominator]);
    });
  });
  return backEdges;
};

const freshVars = (existing: string[]) => {
  let fresh_var = 0;
  return () => {
    let new_var = "__" + fresh_var++;
    while (existing.includes(new_var)) {
      new_var = "__" + fresh_var++;
    }
    return new_var;
  };
};

export const getNaturalLoops = (backEdges: string[][], predecessorMap: IStringsMap) => {
  const recursePredecessors = (tail: string, loop: string[], explored: string[]) => {
    explored.push(tail);
    if (!predecessorMap[tail]) debugger;
    predecessorMap[tail].forEach((tailPredecessor) => {
      if (!explored.includes(tailPredecessor)) recursePredecessors(tailPredecessor, loop, explored);
    });
    loop.push(tail);
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

export const getLoopExits = (loops: string[][], successorMap: IStringsMap) => {
  const exits: string[][] = [];
  loops.forEach((loop, i) => {
    exits[i] = [];
    loop.forEach((blockName) => {
      successorMap[blockName].forEach((nextBlockName) => {
        if (!loop.includes(nextBlockName)) exits[i].push(nextBlockName);
      });
    });
  });
  return exits;
};

const findLoopInvariants = (blockMap: ICFGBlockMap, loops: string[][], reachingDefs: Record<string, Record<string, string[]>>) => {
  const invariants: Record<string, IBrilValueInstruction[]>[] = [];
  loops.forEach((loop, iLoop) => {
    invariants[iLoop] = {};
    loop.forEach((blockName) => {
      invariants[iLoop][blockName] = [];
      blockMap[blockName].instructions.forEach((instr) => {
        if ("dest" in instr) {
          const valueInstr = instr as IBrilValueInstruction;
          if (instr.op == "const") invariants[iLoop][blockName].push(_.cloneDeep(instr));
          else {
            // instruction has variable arguments
            // instruction will be loop invariant if
            // a) all arguments have reaching definitions from outside the loop, or
            // b) all arguments have 1 reaching definition that is itself loop invariant
            let defs = true;
            instr.args.forEach((arg) => {
              const blocksArgReachedFrom = reachingDefs[blockName][arg];
              if (!blocksArgReachedFrom) debugger;
              const cond1 = blocksArgReachedFrom.every((b) => loop.includes(b) == false); // all blocks arg reached from are outside the loop
              const li = invariants[iLoop][blocksArgReachedFrom[0]] || [];
              const cond2 = blocksArgReachedFrom.length == 1 && li.some((li_instr) => li_instr.dest == arg);
              defs = (cond1 || cond2) && defs;
            });
            if (defs) invariants[iLoop][blockName].push(_.cloneDeep(instr));
          }
        }
      });
    });
  });
  return invariants;
};

const createPreheaders = (blockMap: ICFGBlockMap, loops: string[][], predecessorMap: IStringsMap) => {
  const newBlocks: ICFGBlockMap = {};
  const blockNames = Object.keys(blockMap);
  const preHeaderMap: Record<string, string> = {}; // map block to it's pre-header

  blockNames.forEach((blockName, iBlock) => {
    newBlocks[blockName] = _.cloneDeep(blockMap[blockName]);
    if (iBlock + 1 < blockNames.length) {
      loops.forEach((loop) => {
        if (blockNames[iBlock + 1] == loop[0]) {
          // if the next block is a loop header then insert a preheader before the loop header
          // loop[0] is the header
          const headerName = blockNames[iBlock + 1];
          const preheaderName = brilBuilder.freshVar(headerName + ".prehd");
          newBlocks[preheaderName] = {
            name: preheaderName,
            instructions: [{ op: "jmp", labels: [headerName] }],
            defined: [],
            keyEnd: -99,
            keyStart: -99,
            live: [],
            out: [headerName], // stich pre-header to loop header
          };

          loop.forEach((b) => (preHeaderMap[b] = preheaderName));
        }
      });
    }
  });

  // now connect header predecessors (except the backedge tail) to the preheader instead of the header
  loops.forEach((loop) => {
    const headerName = loop[0];
    const tailName = _.last(loop);
    if (!tailName) throw new Error("invalid loop");
    const preheaderName = preHeaderMap[headerName];
    predecessorMap[headerName].forEach((p) => {
      if (!(p == tailName)) {
        // replace headerName with preheaderName in block terminator instruction
        const terminatorInstruction = _.last(newBlocks[p].instructions);
        if (!terminatorInstruction) throw new Error(`block ${blockMap[p].name} has invalid terminator instruction - empty instruction array`);
        if (!["jmp", "ret", "br"].includes(terminatorInstruction.op))
          throw new Error(`block ${blockMap[p].name} has invalid terminator instruction ${terminatorInstruction.op}`);
        if (!("labels" in terminatorInstruction)) throw new Error("invalid terminator instruction");
        terminatorInstruction.labels = terminatorInstruction.labels?.map((label) => (label == headerName ? preheaderName : label));
        // replace headerName with preheaderName in block out
        newBlocks[p].out = newBlocks[p].out.map((b) => (b == headerName ? preheaderName : b));
      }
    });
  });

  return { newBlocks, preHeaderMap };
};

const moveLI = (
  blockMap: ICFGBlockMap,
  preHeaderMap: Record<string, string>,
  invariants: Record<string, IBrilValueInstruction[]>[],
  loops: string[][],
  dom: IStringsMap,
  liveOut: Record<string, string[]>,
  exits: string[][]
) => {
  const licd: IBrilValueInstruction[][] = []; // [loopIndex][...InvariantInstructionsForThatLoop]
  const blockNames = Object.keys(blockMap);

  loops.forEach((loop, iLoop) => {
    licd[iLoop] = [];

    // collect all definitions from every block within the loop
    const defs = loop.reduce((accum, loopBlockName) => {
      accum.push(
        ...blockMap[loopBlockName].instructions.filter((instr) => "dest" in instr).map((instr) => (instr as IBrilValueInstruction).dest)
      );
      return accum;
    }, [] as string[]);

    // for each block in the loop
    Object.keys(invariants[iLoop]).forEach((blockName) => {
      const ind = blockNames.indexOf(preHeaderMap[blockName]) - 1; // predecessor of the preHeader

      // for each invariant instruction in the current block
      invariants[iLoop][blockName].forEach((invariantInstruction, iInvariantInstruction) => {
        const edest = exits[iLoop].filter((exitBlockName) => liveOut[exitBlockName].includes(invariantInstruction.dest));
        // cond1: there is only 1 definition of dest in the full loop
        const cond1 =
          defs.reduce((accum, cur) => {
            if (cur == invariantInstruction.dest) accum++;
            return accum;
          }, 0) == 1;
        // cond2: dest is not live out of preheader
        const cond2 = liveOut[blockNames[ind]].includes(invariantInstruction.dest) == false;
        // cond3: block dominates all loop exits where dest is live out
        const cond3 = edest.every((exitBlockName) => dom[exitBlockName].includes(blockName));
        console.log(`block ${blockName}, invariant intruction dest ${invariantInstruction.dest}, codeMotion = `, cond1, cond2, cond3);
        if (cond1 && cond2 && cond3) {
          _.remove(blockMap[blockName].instructions, (i) => "dest" in i && i.dest == invariantInstruction.dest);
          blockMap[preHeaderMap[blockName]].instructions.unshift(invariantInstruction); // unshift because preheader comes with preformed terminator instruction
          licd[iLoop].push(invariantInstruction);
        }
      });
    });
  });

  return { postCodeMotionBlocks: blockMap, liInstructions: licd };
};

// map of definitions in loop
// {
//   varName: [{ blockName, instrIndx }, ...]
// }

const getLoopDefinitions = (blockMap: ICFGBlockMap, loop: string[]) => {
  let result: Record<
    string,
    {
      blockName: string;
      instrIndx: number;
    }[]
  > = {};

  for (let blockName of loop) {
    blockMap[blockName].instructions.forEach((instr, instrIndx) => {
      if ("dest" in instr) {
        if (instr.dest in result)
          result.dest.push({
            blockName,
            instrIndx,
          });
        else result[instr.dest] = [{ blockName, instrIndx }];
      }
    });
  }
  return result;
};

interface IInductionParam {
  op: "const" | "ptrconst" | "add" | "mul" | "ptradd";
  arg: IInductionParam[] | string;
}

interface IInductionVar {
  v: string;
  a: IInductionParam;
  b?: IInductionParam;
}

type IInductionVarMap = Record<string, IInductionVar>;

const getBasicInductionVars = (blockMap: ICFGBlockMap, loop: string[], liInstructions: IBrilValueInstruction[]) => {
  // v = add v const or v = ptradd v const
  const inductionVarMap: Record<string, IInductionVar> = {};
  const loopDefs = getLoopDefinitions(blockMap, loop);

  for (let defsOfVar of Object.values(loopDefs)) {
    if (defsOfVar.length == 1) {
      const defOfVar = defsOfVar[0];
      const instr = blockMap[defOfVar.blockName].instructions[defOfVar.instrIndx];

      if ("dest" in instr) {
        if (instr.op == "add" || instr.op == "ptradd") {
          const destIndx = instr.args.indexOf(instr.dest);
          if (destIndx != -1) {
            // instr is x = add/ptradd x y, or add/ptradd y x
            // now check if y is loop invariant
            const otherIndx = 1 - destIndx;
            if (liInstructions.some((liInstr) => liInstr.dest == instr.args[otherIndx])) {
              // the other arg is loop invariant
              inductionVarMap[instr.dest] = {
                v: instr.dest,
                a: {
                  op: instr.op == "add" ? "const" : "ptrconst",
                  arg: instr.args[otherIndx],
                },
              };
            }
          }
        }
      }
    }
  }

  return inductionVarMap;
};

const extractDerivedInductionVar = (
  instr: IBrilValueInstruction,
  basicInductionVarMap: IInductionVarMap,
  liInstructions: IBrilValueInstruction[]
) => {
  // check if instr is of form: x = mul/add i y
  // where i is a basic induction var and y is loop invariant
  if (instr.op == "add" || instr.op == "mul" || instr.op == "ptradd") {
    const bivArgIndex = instr.args.findIndex((arg) => arg in basicInductionVarMap);
    if (bivArgIndex !== -1) {
      // args[bivArgIndex] is a basic induction variable
      const bivArgName = instr.args[bivArgIndex];

      if (bivArgName == instr.dest) return undefined; // don't process i = mul/add i y

      const basicInductionVar = basicInductionVarMap[bivArgName];
      const otherArgIndex = 1 - bivArgIndex;

      if (liInstructions.find((liInstr) => liInstr.dest == instr.args[otherArgIndex])) {
        // args[otherArgIndex] is loop invariant
        const invariantVar = instr.args[otherArgIndex];

        if (instr.op == "add" || instr.op == "ptradd") {
          // k = j + b   where j is basic induction var {i,a,b} and b is invariant
          // return {k: {j.v, j.a, j.b + b }}
          let newB: IInductionParam;
          if (!basicInductionVar.b) {
            // j.b = 0 therefore k.b =
            newB = { op: "const", arg: instr.args[otherArgIndex] };
          } else {
            debugger; // how got here
            newB = { op: "add", arg: [{ op: "const", arg: invariantVar }, { ...basicInductionVar.b }] };
          }
          return { v: bivArgName, a: { ...basicInductionVar.a }, b: newB };
        } else if (instr.op == "mul") {
          const newA: IInductionParam = { op: "mul", arg: [{ op: "const", arg: invariantVar }, { ...basicInductionVar.a }] };
          let newB: IInductionParam | undefined;
          if (!basicInductionVar.b) {
            newB = undefined;
          } else {
            newB = { op: "mul", arg: [{ op: "const", arg: invariantVar }, { ...basicInductionVar.b }] };
          }
          return { v: bivArgName, a: newA, b: newB };
        }
      }
    }
  }
  return undefined;
};

const getDerivedInductionVarMap = (
  blockMap: ICFGBlockMap,
  loop: string[],
  basicInductionVarMap: IInductionVarMap,
  liInstructions: IBrilValueInstruction[]
) => {
  const derivedInductionVarMap: Record<string, [IBrilValueInstruction, IInductionVar]> = {};
  const loopDefs = getLoopDefinitions(blockMap, loop);
  for (let defsOfVar of Object.values(loopDefs)) {
    if (defsOfVar.length == 1) {
      const defOfVar = defsOfVar[0];
      const instr = blockMap[defOfVar.blockName].instructions[defOfVar.instrIndx];
      if ("dest" in instr) {
        const derivedInductionVar = extractDerivedInductionVar(instr, basicInductionVarMap, liInstructions);
        if (derivedInductionVar) {
          derivedInductionVarMap[instr.dest] = [instr, derivedInductionVar];
        }
      }
    }
  }

  return derivedInductionVarMap;
};

const generateInstructionsFromInductionParam = (
  inductionParam: IInductionParam,
  getFreshVars: () => string
): [string, IBrilValueInstruction[]] => {
  if (typeof inductionParam.arg === "string") {
    return [inductionParam.arg, []];
  } else {
    if (inductionParam.op == "add" || inductionParam.op == "mul" || inductionParam.op == "ptradd") {
      const [leftDest, leftInstrs] = generateInstructionsFromInductionParam(inductionParam.arg[0], getFreshVars);
      const [rightDest, rightInstrs] = generateInstructionsFromInductionParam(inductionParam.arg[1], getFreshVars);
      const tmpVar = getFreshVars();
      return [tmpVar, [...leftInstrs, ...rightInstrs, { op: inductionParam.op, dest: tmpVar, type: "int", args: [leftDest, rightDest] }]];
    } else {
      debugger;
      throw "Invalid inductionparam";
    }
  }
};

const strengthReduction = (
  getFreshVars: () => string,
  isPtr: boolean,
  dest: string,
  inductionVar: IInductionVar,
  loop: string[],
  blockMap: ICFGBlockMap,
  preHeaderBlock: ICFGBlock
) => {
  // j is induction var (i, c, d)
  // assignments of form k = j * b
  // will be mapped to k => (i, c, d+b)
  // in pre-header:
  //   k.iv = mul i c
  //   k.iv = add k.iv b
  // in loop:
  //   replace k = mul j b  =>   k = k.iv
  //   add after i = add i 1   =>  k.iv = add k.iv a

  let bVar;

  // insert pre-header instructions
  const preheadInstrs: IBrilValueInstruction[] = [];
  const [aVar, aInstrs] = generateInstructionsFromInductionParam(inductionVar.a, getFreshVars);
  console.log("Strength reduction genInstr", aVar, aInstrs);
  const tmpVar = getFreshVars();
  if (!inductionVar.b) {
    preheadInstrs.push(...aInstrs, { op: "mul", dest: tmpVar, type: "int", args: [inductionVar.v, aVar] });
  } else {
    const [bVar, bInstrs] = generateInstructionsFromInductionParam(inductionVar.b, getFreshVars);
    preheadInstrs.push(...aInstrs, ...bInstrs);
    const tmpVar2 = getFreshVars();
    const mulInstr = { op: "mul", dest: tmpVar2, type: "int", args: [inductionVar.v, aVar] } as IBrilValueInstruction;
    const addInstr = {
      op: isPtr ? "ptradd" : "add",
      dest: tmpVar,
      type: isPtr ? { ptr: "init" } : "int",
      args: [bVar, tmpVar2],
    } as IBrilValueInstruction;
    preheadInstrs.push(...aInstrs, mulInstr, addInstr);
  }
  preHeaderBlock.instructions = [...preHeaderBlock.instructions.slice(0, -1), ...preheadInstrs, ...preHeaderBlock.instructions.slice(-1)];

  for (let blockName of loop) {
    const blockInstrs: IBrilInstruction[] = [];
    for (let instr of blockMap[blockName].instructions) {
      if ("dest" in instr) {
        if (instr.dest == dest) {
          // replace k = mul j b with k = k.iv
          blockInstrs.push({ op: "id", args: [tmpVar], dest, type: isPtr ? { ptr: "int" } : "int" });
          console.log(`replaced in block ${blockName}: `, instr, _.last(blockInstrs));
        } else if (instr.dest == inductionVar.v) {
          // i=i+1
          // k.iv = k.iv + a
          blockInstrs.push(instr, { op: isPtr ? "ptradd" : "add", dest: tmpVar, type: isPtr ? { ptr: "int" } : "int", args: [tmpVar, aVar] });
          console.log(`added in block ${blockName}`, instr, _.last(blockInstrs));
        } else {
          blockInstrs.push(instr);
        }
      } else {
        blockInstrs.push(instr);
      }
    }
    blockMap[blockName].instructions = [...blockInstrs];
  }
  return [aVar, bVar, tmpVar];
};

export const licm = (func: IBrilFunction, blockMap: ICFGBlockMap) => {
  const blocks = Object.values(blockMap);
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
  const dominatorMap = getDominatorMap(successorsMap, Object.keys(blockMap)[0]);
  const backEdges = getBackEdges(blocks, dominatorMap, successorsMap);
  const loops = getNaturalLoops(backEdges, predecessorsMap);
  const exits = getLoopExits(loops, successorsMap);
  const { _in: liveIn, _out: liveOut } = dfWorklist(blockMap, ANALYSES["live"]);
  const { _in: reachingIn, _out: reachingOut } = dfWorklist(blockMap, ANALYSES["reaching"]);
  console.log("Reaching", reachingIn);

  // LICM
  const invariants = findLoopInvariants(blockMap, loops, reachingIn);
  const { newBlocks, preHeaderMap } = createPreheaders(blockMap, loops, predecessorsMap);
  const { postCodeMotionBlocks, liInstructions } = moveLI(newBlocks, preHeaderMap, invariants, loops, dominatorMap, liveOut, exits);

  // Strength Reduction
  const defined = _.flatten(Object.values(dfWorklist(postCodeMotionBlocks, ANALYSES["written"])._out as Record<string, string[]>));
  const getFreshVars = freshVars(defined);
  loops.forEach((loop, iLoop) => {
    const basicInductionVars = getBasicInductionVars(postCodeMotionBlocks, loops[iLoop], liInstructions[iLoop]);
    console.log(`Loop ${iLoop} basicInductionVars`, basicInductionVars);
    const derivedInductionVarMap = getDerivedInductionVarMap(postCodeMotionBlocks, loops[iLoop], basicInductionVars, liInstructions[iLoop]);
    console.log(`Loop ${iLoop} derivedInductionVars`, derivedInductionVarMap);

    for (let [dest, [instr, inductionVar]] of Object.entries(derivedInductionVarMap)) {
      const isPtr = instr.op == "ptradd";
      let [a, b, newDest] = strengthReduction(
        getFreshVars,
        isPtr,
        dest,
        inductionVar,
        loop,
        postCodeMotionBlocks,
        postCodeMotionBlocks[preHeaderMap[loop[0]]]
      );
      console.log("done strength reduction", a, b, newDest);
    }
  });

  // temp
  const sr = postCodeMotionBlocks;

  return {
    blockMap: sr,

    liInstructions,

    stats: {
      loops: liInstructions.length,

      motion: liInstructions.reduce((accum, cur) => {
        return (accum += cur.length);
      }, 0),
    },
  };
};
