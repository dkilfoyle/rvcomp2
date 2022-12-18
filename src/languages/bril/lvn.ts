// LVN
// Find multiple instances of equivalent expressions and replace them with the first (canonical) occurrence

import { IBrilConst, IBrilInstructionOrLabel, IBrilValueInstruction } from "./BrilInterface";
import { ICFG, ICFGBlockMap } from "./cfgBuilder";

// const flattenCfgInstructions = (fn: string) => {
//   const blocks = store.getState().parse.cfg[fn];
//   const instructions: IBrilInstructionOrLabel[] = [];
//   Object.values(blocks).forEach((block) => {
//     instructions.push(...block.instructions);
//   });
//   return instructions;
// };

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
  toTable() {
    return this.rows.map((row) => ({ value: row.value.toString(), canonvar: row.canonvar, constval: row.constval?.toString() }));
  }
  addVar(varname: string, num: number) {
    this.var2num[varname] = num;
  }
  addValue(value: LVNValue, canonvar: string) {
    if (this.hasValue(value)) debugger; //throw new Error("LVNTable already has " + value.toString());
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

const foldable_ops: Record<string, (a: number, b: number) => number> = {
  add: (a: number, b: number) => a + b,
  mul: (a: number, b: number) => a * b,
  sub: (a: number, b: number) => a - b,
  div: (a: number, b: number) => a / b,
  gt: (a: number, b: number) => (a > b ? 1 : 0),
  lt: (a: number, b: number) => (a < b ? 1 : 0),
  ge: (a: number, b: number) => (a >= b ? 1 : 0),
  le: (a: number, b: number) => (a <= b ? 1 : 0),
  ne: (a: number, b: number) => (a != b ? 1 : 0),
  eq: (a: number, b: number) => (a == b ? 1 : 0),
  or: (a: number, b: number) => a | b,
  and: (a: number, b: number) => a & b,
  not: (a: number) => (!a ? 1 : 0),
};

const fold = (lvntable: LVNTable, value: LVNValue) => {
  if (value.op in foldable_ops) {
    const const_args = value.args.map((arg) => lvntable.rows[arg].constval);
    let const_count = 0;
    const_args.forEach((arg) => {
      if (typeof arg !== "undefined") const_count++;
    });

    if (const_count == 2 && value.op in foldable_ops) return foldable_ops[value.op](const_args[0]!, const_args[1]!);
    if (const_count == 1 && value.args.length == 1 && value.op == "not") return foldable_ops["not"](const_args[0]!, 0);
    if (const_count == 1 && ["eq", "ne", "le", "ge"].includes(value.op) && value.args[0] == value.args[1]) return value.op !== "ne" ? 1 : 0;
    if (const_count == 1 && ["and", "or"].includes(value.op)) {
      const const_val = lvntable.rows[typeof const_args[0] !== undefined ? const_args[0]! : const_args[1]!].constval;
      if ((value.op == "and" && !const_val) || (value.op == "or" && const_val)) return const_val;
    }
  }
  return undefined;
};

interface ILVNStats {
  blocks: Record<
    string,
    {
      initialInstructionLength: number;
      finalInstructionLength: number;
      lvntable: { value: string; canonvar: string; constval: string | undefined }[];
    }
  >;
}

export const lvn = (blockMap: ICFGBlockMap) => {
  const lvnstats: ILVNStats = { blocks: {} };

  Object.keys(blockMap).forEach((b) => {
    const block = blockMap[b];
    const new_instructions: IBrilInstructionOrLabel[] = [];
    const lvntable = new LVNTable();
    const _last_writes = last_writes(block.instructions);

    // add as input values all variabes that are read before written in this block
    // these will be variables that have come from function input or previous blocks
    read_first(block.instructions).forEach((varname) => {
      lvntable.addValue(new LVNValue("input" + varname), varname);
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
            new_instructions.push({ ...instr, op: "const", value: lvntable.num2const(num), args: [] } as IBrilConst);
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
            new_instructions.push({ dest: instr.dest, pos: instr.pos, type: instr.type, op: "const", value: constValue } as IBrilConst);
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
    lvnstats.blocks[block.name] = {
      initialInstructionLength: block.instructions.length,
      finalInstructionLength: new_instructions.length,
      lvntable: lvntable.toTable(),
    };
    blockMap[b].instructions = new_instructions;
    // blockMap[b].lvntable = lvntable.toTable();
  });
  return lvnstats;
};