import { setBrilFunctionInstructions, setCfgBlockInstructions } from "../../store/parseSlice";
import store from "../../store/store";
import { IBrilConst, IBrilInstructionOrLabel, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
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
        console.info(`  ${fn}: deleted `, ins);
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
  console.info("Optimization: Performing DCE...");
  Object.keys(cfg).forEach((fn) => {
    dceIterations = 0;
    dceRemovedInsCount = 0;
    while (dce_pass(fn)) {
      dceIterations++;
    }
    if (dceRemovedInsCount > 0) {
      console.info(`  Function ${fn}: Removed ${dceRemovedInsCount} instructions in ${dceIterations} iterations`);
      store.dispatch(setBrilFunctionInstructions({ fn, instructions: flattenCfgInstructions(fn) }));
    } else console.info(`  Function ${fn}: No dead code detected`);
  });
};

interface ILVNValue {
  op: string;
  args?: number[];
}

interface ILVNTableEntry {
  value: ILVNValue;
  variable: string;
}

// lvntable
// index | value      | variable
// ------|------------|---------
// 0     | const 6    | a
// 1     | add #1, #2 | sum1

export const lvn = (cfg: ICFG) => {
  console.info("Optimization: Performing LVN...");
  Object.keys(cfg).forEach((fn) => {
    const blocks = store.getState().parse.cfg[fn];
    blocks.forEach((block, i) => {
      const new_instructions: IBrilInstructionOrLabel[] = [];
      const lvntable: ILVNTableEntry[] = [];
      const lookup: Record<string, number> = {};
      for (let instruction of block.instructions) {
        if ("dest" in instruction) {
          switch (instruction.op) {
            case "const":
              {
                const ins = instruction as IBrilConst;
                const ti = lvntable.findIndex((te) => te.value.op === `const ${ins.value}`);
                if (ti > -1) {
                  // this const value already exists so use that variable instead
                  lookup[ins.dest] = ti;
                  console.info(`  ${fn}: block ${i}: dropped duplicate const `, ins);
                } else {
                  // a new const value so add to lvntable
                  lvntable.push({ value: { op: `const ${ins.value}` }, variable: ins.dest });
                  lookup[ins.dest] = lvntable.length - 1;
                  new_instructions.push({ ...ins });
                }
              }
              break;
            case "add":
            case "mul": {
              const ins = instruction as IBrilValueOperation;
              const args = ins.args.map((arg) => lookup[arg]).sort((a, b) => a - b); // sort so that a+b is same as b+a
              const op = `${ins.op} ${args[0]} ${args[1]}`;
              const ti = lvntable.findIndex((te) => te.value.op === op);
              if (ti > -1) {
                // this same expression already exists so use that variable instead
                new_instructions.push({ op: "id", args: [lvntable[ti].variable], dest: ins.dest, type: ins.type });
                lookup[ins.dest] = ti;
              } else {
                // a new expression value so add to lvntable
                lvntable.push({ value: { op }, variable: ins.dest });
                lookup[ins.dest] = lvntable.length - 1;
                new_instructions.push({ ...ins, args: [lvntable[args[0]].variable, lvntable[args[1]].variable] });
              }
            }
          }
        } else new_instructions.push({ ...instruction });
      }
      console.info(`  ${fn}: block ${i}: Instruction count ${block.instructions.length} => ${new_instructions.length}`, lvntable);
      // todo updateCfgBlock with new_instructions, lvntable, lookup
    });
  });
};
