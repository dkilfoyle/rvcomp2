import { IBrilFunction, IBrilInstructionOrLabel } from "./BrilInterface";
import { ICFGBlock, ICFGBlockMap } from "./cfg";

let dceRemovedInsCount = 0;
let dceIterations = 0;

export interface IDCEStats {
  removedInstructions: IBrilInstructionOrLabel[];
  iterations: number;
}

const dce_UndefinedPhiVariablePass = (blocks: ICFGBlock[]) => {
  const undefinedVars: string[] = ["__undefined"];
  let changed = false;
  blocks.forEach((block) => {
    const new_block = block.instructions.filter((ins) => {
      if ("dest" in ins && ins.op == "id") {
        if (undefinedVars.includes(ins.args[0])) {
          undefinedVars.push(ins.dest);
          return false; // don't keep
        } else return true;
      } else return true;
    });
    if (new_block.length != block.instructions.length) {
      changed = true;
      block.instructions = new_block;
    }
  });
  return changed;
};

const dce_UnsuedVariablesPass = (blocks: ICFGBlock[], func: IBrilFunction, stats: IDCEStats) => {
  // find all variables used as an argument in any instruction in all the blocks
  const used = new Set<string>();
  for (let block of blocks) {
    for (let ins of block.instructions) if ("args" in ins) ins.args?.forEach((arg) => used.add(arg));
  }

  // delete the instructions that write to unused variables - variables that will not be an argument
  let changed = false;
  blocks.forEach((block, blockIndex) => {
    // include all effect instructions and all value instructions that write to a used variable
    // this will delete value instructions that write to an unused variable
    const new_block = block.instructions.filter((ins) => {
      const keep = !("dest" in ins) || used.has(ins.dest);
      if (!keep) {
        stats.removedInstructions.push({ ...ins });
      }
      return keep;
    });
    if (new_block.length != block.instructions.length) {
      changed = true;
      block.instructions = new_block;
    }
  });

  return changed;
};

export const runDCE = (blockMap: ICFGBlockMap, func: IBrilFunction) => {
  dceIterations = 0;
  const stats: IDCEStats = {
    removedInstructions: [],
    iterations: 0,
  };
  const blocks = Object.values(blockMap);

  dce_UndefinedPhiVariablePass(blocks);

  while (dce_UnsuedVariablesPass(blocks, func, stats)) {
    dceIterations++;
  }
  stats.iterations = dceIterations;
  return { removed: stats.removedInstructions.length, iterations: stats.iterations };
};
