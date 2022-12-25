// LVN
// Find multiple instances of equivalent expressions and replace them with the first (canonical) occurrence

import { IBrilConst, IBrilInstruction, IBrilInstructionOrLabel, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
import { ICFGBlockMap } from "./cfgBuilder";
import { IDictStrings } from "./utils";
import { fold, VNTable, VNValue } from "./vn";

// const flattenCfgInstructions = (fn: string) => {
//   const blocks = store.getState().parse.cfg[fn];
//   const instructions: IBrilInstructionOrLabel[] = [];
//   Object.values(blocks).forEach((block) => {
//     instructions.push(...block.instructions);
//   });
//   return instructions;
// };

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

interface ILVNStats {
  blocks: Record<
    string,
    {
      initialInstructionLength: number;
      finalInstructionLength: number;
      vnTable: { value: string; canonvar: string; constval: string | undefined }[];
    }
  >;
}

export const lvn = (blockMap: ICFGBlockMap) => {
  const lvnstats: ILVNStats = { blocks: {} };

  Object.keys(blockMap).forEach((b) => {
    const block = blockMap[b];
    const new_instructions: IBrilInstruction[] = [];
    const vnTable = new VNTable();
    const _last_writes = last_writes(block.instructions);

    // add as input values all variabes that are read before written in this block
    // these will be variables that have come from function input or previous blocks
    read_first(block.instructions).forEach((varname) => {
      vnTable.addValue(new VNValue("input" + varname), varname);
    });

    block.instructions.forEach((instr, instrIndex) => {
      let value;
      if ("dest" in instr && "args" in instr && instr.op != "call") {
        // if non-call non-const value instruction with args
        value = vnTable.instruction2value(instr);
        const num = vnTable.value2num(value);
        if (num != -1) {
          // if canonical value already exists
          // link instr.dest to num
          vnTable.addVar(instr.dest, num);

          if (vnTable.isConst(num)) {
            // Constant Propogation
            // replace this instruction with the canonical const
            // eg original instruction was y=x but x is a const so replace with y=5
            new_instructions.push({ ...instr, op: "const", value: vnTable.num2const(num), args: [] } as IBrilConst);
          } else {
            // Copy Propogation
            // replace this instruction with the canonical variable ie dest = canonvar
            new_instructions.push({ ...instr, op: "id", args: [vnTable.num2canonvar(num)] });
          }
          return; // to next instruction in block
        }
      }

      if ("dest" in instr) {
        // instruction produces a new value
        const newnum = vnTable.addValue(new VNValue("blank_" + instr.dest), instr.dest);

        if ("value" in instr) vnTable.rows[newnum].constval = (instr as IBrilConst).value as number;

        // rename the dest if it will be written to again
        const varName = _last_writes[instrIndex] ? instr.dest : `lvn.${instr.dest}.${newnum}`;
        vnTable.rows[vnTable.rows.length - 1].canonvar = varName;

        if (value) {
          const constValue = fold(vnTable, value);
          if (typeof constValue !== "undefined") {
            vnTable.rows[newnum].constval = constValue;
            new_instructions.push({ dest: instr.dest, pos: instr.pos, type: instr.type, op: "const", value: constValue } as IBrilConst);
            return; // to next instruction
          }
          // not a foldable const instruction
          vnTable.rows[newnum].value = value;
        }

        if ("args" in instr)
          new_instructions.push({ ...instr, dest: varName, args: vnTable.vars2canonvars(instr.args) } as IBrilValueInstruction);
        else new_instructions.push({ ...instr, dest: varName } as IBrilValueInstruction);
      } else {
        // not a value instruction but still need to convert args
        if ("args" in instr && instr.args)
          new_instructions.push({ ...instr, args: vnTable.vars2canonvars(instr.args) } as IBrilValueInstruction);
        else new_instructions.push({ ...instr } as IBrilValueInstruction);
      }
    });
    lvnstats.blocks[block.name] = {
      initialInstructionLength: block.instructions.length,
      finalInstructionLength: new_instructions.length,
      vnTable: vnTable.toTable(),
    };
    blockMap[b].instructions = new_instructions;
    // blockMap[b].vnTable = vnTable.toTable();
  });
  return lvnstats;
};
