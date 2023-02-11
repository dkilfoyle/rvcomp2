// Loop invariant code:
// https://www.cs.cornell.edu/courses/cs6120/2019fa/blog/loop-reduction/
// https://github.com/neiladit/bril/blob/master/SR_LICM/funcs.py

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

export const getNaturalLoops = (backEdges: string[][], predecessorMap: IStringsMap) => {
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
    const tailName = loop[1];
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

// const createPreheaders = (blockMap: ICFGBlockMap, loops: string[][]) => {
//   const newBlocks: ICFGBlockMap = {};
//   const blockNames = Object.keys(blockMap);
//   const preHeaderMap: Record<string, string> = {}; // map block to it's pre-header

//   blockNames.forEach((blockName, iBlock) => {
//     newBlocks[blockName] = _.cloneDeep(blockMap[blockName]);
//     if (iBlock + 1 < blockNames.length) {
//       loops.forEach((loop) => {
//         if (loop.includes(blockNames[iBlock + 1])) {
//           const name = brilBuilder.freshVar("prehd");
//           newBlocks[name] = {
//             name,
//             instructions: [],
//             defined: [],
//             keyEnd: -99,
//             keyStart: -99,
//             live: [],
//             out: [],
//           };
//           loop.forEach((b) => (preHeaderMap[b] = name));
//         }
//       });
//     }
//   });
//   return { newBlocks, preHeaderMap };
// };

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

  return { codeMotion: blockMap, licd };
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

  const invariants = findLoopInvariants(blockMap, loops, reachingIn);
  const { newBlocks, preHeaderMap } = createPreheaders(blockMap, loops, predecessorsMap);
  const { codeMotion, licd } = moveLI(newBlocks, preHeaderMap, invariants, loops, dominatorMap, liveOut, exits);

  // console.log("invariants: ", invariants);
  // console.log("preHeaderMap: ", preHeaderMap);
  // console.log("codeMotion", codeMotion);
  // console.log("licd: ", licd);

  return {
    blockMap: newBlocks,
    stats: {
      loops: licd.length,
      motion: licd.reduce((accum, cur) => {
        return (accum += cur.length);
      }, 0),
    },
  };
};

const getInductionVars = (
  blockMap: ICFGBlockMap,
  loops: string[][],
  licd: IBrilValueInstruction[][],
  reachingDefs: Record<string, Record<string, string[]>>
) => {
  const constants: IStringsMap = {};
  loops.forEach((loop, iLoop) => {
    const [head, tail] = loop;

    // for each variable that reaches the loop header
    Object.keys(reachingDefs[head]).forEach((reachingVar) => {
      // test if it has reached from outside of the loop, if so it is loop invariant and "constant" with respect to the loop
      if (!reachingDefs[head][reachingVar].includes(head) && !reachingDefs[head][reachingVar].includes(tail))
        constants[iLoop].push(reachingVar);
    });

    // for each variable that reaches the loop tail
    Object.keys(reachingDefs[tail]).forEach((reachingVar) => {
      // test if it has reached from outside of the loop, if so it is loop invariant and "constant" with respect to the loop
      if (!reachingDefs[head][reachingVar].includes(head) && !reachingDefs[head][reachingVar].includes(tail))
        constants[iLoop].push(reachingVar);
    });
  });
};
