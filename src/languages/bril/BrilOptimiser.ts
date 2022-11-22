import { timeStamp } from "console";
import { setBrilOptimFunctionInstructions, setCfgBlockInstructions } from "../../store/parseSlice";
import store from "../../store/store";
import { IBrilConst, IBrilEffectOperation, IBrilInstructionOrLabel, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
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
      store.dispatch(setBrilOptimFunctionInstructions({ fn, instructions: flattenCfgInstructions(fn) }));
    } else console.info(`  Function ${fn}: No dead code detected`);
  });
};

class LVNValue {
  op: string;
  args: number[];
  constructor(op: string, args: number[] = []) {
    this.op = op;
    this.args = args;
  }
  toString() {
    if (this.op == "const") return `${this.op} ${this.args[0]}`;
    else return `${this.op} ${this.args.map((arg) => "#" + arg).join(" ")}`;
  }
}

export class LVNTable {
  rows: { value: LVNValue; canonvar: string; constval?: number }[];
  var2num: Record<string, number>;
  constructor() {
    this.rows = [];
    this.var2num = {};
  }
  addVar(varname: string, num: number) {
    this.var2num[varname] = num;
  }
  addValue(value: LVNValue, canonvar: string) {
    if (this.hasValue(value)) throw new Error("LVNTable already has" + value.toString());
    this.rows.push({ value, canonvar });
    this.addVar(canonvar, this.rows.length - 1);
    return this.rows.length - 1;
  }
  hasValue(value: LVNValue) {
    return this.rows.some((r) => r.value.toString() == value.toString());
  }
  value2num(value: LVNValue) {
    if (value.op == "id") return value.args[0]; // use the underlying value number
    return this.rows.findIndex((r) => r.value.toString() == value.toString());
  }
  num2canonvar(num: number) {
    return this.rows[num].canonvar;
  }
  instruction2value(instruction: IBrilValueInstruction) {
    let args = "args" in instruction ? instruction.args : [];
    let argsNum = args.map((arg) => this.var2num[arg]);
    if (instruction.op == "add" || instruction.op == "mul") argsNum.sort((a, b) => a - b);
    return new LVNValue(instruction.op, argsNum);
  }
  isConst(num: number) {
    return typeof this.rows[num].constval !== "undefined";
  }
  num2const(num: number) {
    return this.rows[num].constval;
  }
  var2canonvar(arg: string) {
    return this.num2canonvar(this.var2num[arg]);
  }
  vars2canonvars(args: string[]) {
    return args.map((arg) => this.var2canonvar(arg));
  }
}

// lvntable
// index | value      | canonvar | constval
// ------|------------|----------|-----------
// 0     | const 6    | a        | 6
// 1     | add #1, #2 | sum1     |

const read_first = (instructions: IBrilInstructionOrLabel[]) => {
  const read = new Set<string>();
  const written = new Set<string>();
  for (let instr of instructions) {
    if ("args" in instr) {
      instr.args?.forEach((arg) => {
        if (!written.has(arg)) read.add(arg);
      });
    }
    if ("dest" in instr) written.add(instr.dest);
  }
  return read;
};

const last_writes = (instructions: IBrilInstructionOrLabel[]) => {
  const seen = new Set<string>();
  const out = new Array<boolean>(instructions.length);
  [...instructions].reverse().forEach((instr, index) => {
    if ("dest" in instr) {
      if (seen.has(instr.dest) == false) {
        out[instructions.length - 1 - index] = true;
        seen.add(instr.dest);
      }
    }
  });
  return out;
};

const fold = (lvntable: LVNTable, value: LVNValue) => {
  return undefined;
};

export const lvn = (cfg: ICFG) => {
  console.info("Optimization: Performing LVN...");
  Object.keys(cfg).forEach((fn) => {
    const blocks = store.getState().parse.cfg[fn];
    blocks.forEach((block, blockIndex) => {
      const new_instructions: IBrilInstructionOrLabel[] = [];
      const lvntable = new LVNTable();
      const _last_writes = last_writes(block.instructions);

      // add as input values all variabes that are read before written in this block
      // these will be variables that have come from function input or previous blocks
      read_first(block.instructions).forEach((varname) => {
        lvntable.addValue(new LVNValue("input"), varname);
      });

      block.instructions.forEach((instr, instrIndex) => {
        let value;
        if ("dest" in instr && "args" in instr && instr.op != "call") {
          // if non-call non-const value instruction with args
          value = lvntable.instruction2value(instr);
          const num = lvntable.value2num(value);
          if (num != -1) {
            // if canonical value already exists
            // link instr.dest to num
            lvntable.addVar(instr.dest, num);

            if (lvntable.isConst(num)) {
              // replace this instruction with the canonical const
              // eg original instruction was y=x but x is a const so replace with y=5
              new_instructions.push({ ...instr, op: "const", value: lvntable.num2const(num), args: undefined } as IBrilConst);
            } else {
              // replace this instruction with the canonical variable ie dest = canonvar
              new_instructions.push({ ...instr, op: "id", args: [lvntable.num2canonvar(num)] });
            }
            return; // to next instruction in block
          }
        }

        if ("dest" in instr) {
          // instruction produces a new value
          const newnum = lvntable.addValue(new LVNValue("blank_" + instr.dest), instr.dest);

          if ("value" in instr) lvntable.rows[newnum].constval = (instr as IBrilConst).value as number;

          // rename the dest if it will be written to again
          const varName = _last_writes[instrIndex] ? instr.dest : `lvn.${instr.dest}.${newnum}`;
          lvntable.rows[lvntable.rows.length - 1].canonvar = varName;

          if (value) {
            const constValue = fold(lvntable, value);
            if (typeof constValue !== "undefined") {
              lvntable.rows[newnum].constval = constValue;
              new_instructions.push({ ...instr, op: "const", value: constValue } as IBrilConst);
              return; // to next instruction
            }
            // not a foldable const instruction
            lvntable.rows[newnum].value = value;
          }

          if ("args" in instr)
            new_instructions.push({ ...instr, dest: varName, args: lvntable.vars2canonvars(instr.args) } as IBrilValueInstruction);
          else new_instructions.push({ ...instr, dest: varName } as IBrilValueInstruction);
        } else {
          // not a value instruction but still need to convert args
          if ("args" in instr && instr.args)
            new_instructions.push({ ...instr, args: lvntable.vars2canonvars(instr.args) } as IBrilValueInstruction);
          else new_instructions.push({ ...instr } as IBrilValueInstruction);
        }
      });
      console.info(`  ${fn}: block ${blockIndex}: Instruction count ${block.instructions.length} => ${new_instructions.length}`, lvntable);
      // todo updateCfgBlock with new_instructions, lvntable, lookup
      store.dispatch(setCfgBlockInstructions({ fn, blockIndex, instructions: new_instructions, lvntable }));
    });
    const flattenedInstructions = flattenCfgInstructions(fn);
    console.info(
      `  ${fn}: Instruction count ${store.getState().parse.bril.functions.find((f) => f.name == fn)?.instrs.length} => ${
        flattenedInstructions.length
      }`
    );
    store.dispatch(setBrilOptimFunctionInstructions({ fn, instructions: flattenedInstructions }));
  });
};
