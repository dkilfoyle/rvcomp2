import { setBrilFunctionInstructions, setCfgBlockInstructions } from "../../store/parseSlice";
import store from "../../store/store";
import { IBrilInstructionOrLabel } from "./BrilInterface";
import { ICFG, IControlFlowGraphNode } from "./cfgBuilder";

let dceRemovedInsCount = 0;
let dceIterations = 0;

const flattenCfgInstructions = (fn: string) => {
  const blocks = store.getState().parse.cfg[fn];
  const instructions: IBrilInstructionOrLabel[] = [];
  blocks.forEach((block) => {
    instructions.push(...block.instructions);
  });
  return instructions;
};

const dce_pass = (fn: string) => {
  const blocks = store.getState().parse.cfg[fn];
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
        dceRemovedInsCount++;
        console.log(`  ${fn}: deleted `, ins);
      }
      return keep;
    });
    if (new_block.length != block.instructions.length) {
      changed = true;
      store.dispatch(setCfgBlockInstructions({ fn, blockIndex, instructions: new_block }));
    }
  });

  return changed;
};

export const dce = (cfg: ICFG) => {
  console.log("Optimization: Performing DCE...");
  Object.keys(cfg).forEach((fn) => {
    dceIterations = 0;
    dceRemovedInsCount = 0;
    while (dce_pass(fn)) {
      dceIterations++;
    }
    if (dceRemovedInsCount > 0) {
      console.log(`  Function ${fn}: Removed ${dceRemovedInsCount} instructions in ${dceIterations} iterations`);
      store.dispatch(setBrilFunctionInstructions({ fn, instructions: flattenCfgInstructions(fn) }));
    } else console.log(`  Function ${fn}: No dead code detected`);
  });
};
