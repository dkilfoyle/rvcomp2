import { IBrilFunction, IBrilInstructionOrLabel } from "./BrilInterface";
import { ICFGBlock, ICFGBlockMap } from "./cfgBuilder";

let dceRemovedInsCount = 0;
let dceIterations = 0;

export interface IDCEStats {
  removedInstructions: IBrilInstructionOrLabel[];
  iterations: number;
}

const dce_pass = (blocks: ICFGBlock[], func: IBrilFunction, stats: IDCEStats) => {
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
      // store.dispatch(setCfgBlockInstructions({ fn, blockIndex, instructions: new_block }));
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
  while (dce_pass(blocks, func, stats)) {
    dceIterations++;
  }
  stats.iterations = dceIterations;
  return stats;
};
