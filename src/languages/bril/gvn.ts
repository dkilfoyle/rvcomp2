import { IBrilConst, IBrilFunction, IBrilInstruction, IBrilProgram, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
import { getCfgEdges, ICFGBlockMap } from "./cfgBuilder";
import { getDominanceTree, getDominatorMap } from "./dom";
import { IDictNumber, IDictNumbers, IDictStrings } from "./utils";
import { fold, VNTable, VNValue } from "./vn";

// RPO guarantees that you see a node before all of its successors
export const reversePostOrder = (startBlockName: string, successors: IDictStrings) => {
  const visited: string[] = []; // set
  const order: string[] = [];
  const visit = (blockName: string) => {
    if (!visited.includes(blockName)) visited.push(blockName);
    successors[blockName].forEach((succ) => {
      if (!visited.includes(succ)) visit(succ);
    });
    order.unshift(blockName);
  };

  visit(startBlockName);
  return order;
};

export const isRemovablePhi = (instr: IBrilValueOperation, vnTable: VNTable) => {
  const instrValue = vnTable.instruction2value(instr);

  // meaningless phi nodes have args that are the same value
  //   left:
  //   x.0 = 10
  //   right:
  //   x.1 = 10
  //   x.2 = phi x.0 x.1 left right
  // vnTable.var2num[x.2] = x.0's value number

  let meaningless = true;
  let argValueNumber = -1;
  for (let i = 0; i < instr.args.length; i++) {
    const arg = instr.args[i];
    if (!vnTable.var2num[arg]) {
      meaningless = false;
      break;
    }
    if (argValueNumber == -1) {
      argValueNumber = vnTable.var2num[arg];
      continue;
    }
    if (argValueNumber != vnTable.var2num[arg]) {
      meaningless = false;
      break;
    }
  }
  if (meaningless) {
    vnTable.var2num[instr.dest] = argValueNumber;
    return true;
  }

  // redundant phi nodes are identical to existing
  // left:
  // x.0 = 10
  // y.0 = 10
  // phi x.0 x.1 left right
  // phi y.0 y.1 left right

  const redundant = vnTable.hasValue(instrValue);
  if (redundant) {
    vnTable.addVar(instr.dest, vnTable.value2num(instrValue));
    return true;
  }

  return false;
};

const dvn = (func: IBrilFunction, blockMap: ICFGBlockMap, successors: IDictStrings, domTree: IDictStrings) => {
  const vnTable = new VNTable();

  // insert function args into lvntable
  func.args?.forEach((arg) => vnTable.addValue(new VNValue("input" + arg.name), arg.name));

  const dvnBlock = (blockName: string) => {
    // const pushed: IDictNumber = {};
    console.log("visiting", blockName);
    const new_instructions: IBrilInstruction[] = [];

    // do a phi removal pass
    // remove meaningless (args have same value) or redundant (identical) phis
    blockMap[blockName].instructions.every((instr, i) => {
      // all phis at start of block so abort once see a non-phi
      if (instr.op != "phi") return false; // break

      const instrValue = vnTable.instruction2value(instr);

      if (isRemovablePhi(instr, vnTable)) {
        // instrsToRemove.push(i);
        blockMap[blockName].instructions.splice(i, 1);
      } else {
        vnTable.addValue(instrValue, instr.dest);
        // const instrKey = instrValue.toString();
        // if (!pushed[instrKey]) pushed[instrKey] = 0;
        // else pushed[instrKey] += 1;
        new_instructions.push({ ...instr });
      }
    });

    // do an lvn type pass
    // a) if value already exists in VNTable
    //     1. Common Subexpression Elimination - check if value already exists
    //     2. Copy Propogation - check if assigning to exisiting variable
    // b) if value does not yet exist
    //     1. Generate a new entry in VNTable for this value
    //     2. If op is foldable convertable the instruction to a constant assign with precomputed fold
    blockMap[blockName].instructions.forEach((instr, i) => {
      let value;

      if (instr.op == "phi") return;

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

            // a:int = 10
            // b:int = id a   -----> b:int = const 10

            new_instructions.push({ ...instr, op: "const", value: vnTable.num2const(num), args: [] } as IBrilConst);
          } else {
            // CSE and Copy Propogation
            // replace this instruction with the canonical variable ie dest = canonvar

            // Common Subexpression Elimination
            // a:int = add b c
            // ...
            // x:int = add b c  ---- > x:int = id a

            // Copy propogation
            // a: int = call random
            // b: int = id a
            // c: int = id b  -----> c:int = id a

            new_instructions.push({ ...instr, op: "id", args: [vnTable.num2canonvar(num)] });
          }

          return; // to next instruction in block
        }
      }

      if ("dest" in instr) {
        // instruction produces a new value
        const newnum = vnTable.addValue(new VNValue("blank_" + instr.dest), instr.dest);
        // if const operation then save const value into named value row
        if ("value" in instr) vnTable.rows[newnum].constval = (instr as IBrilConst).value as number;

        if (value) {
          // Constant folding
          const constValue = fold(vnTable, value);
          if (typeof constValue !== "undefined") {
            vnTable.rows[newnum].constval = constValue;
            new_instructions.push({ dest: instr.dest, pos: instr.pos, type: instr.type, op: "const", value: constValue } as IBrilConst);
            return; // to next instruction
          }
          // not a foldable const instruction
          vnTable.rows[newnum].value = value;
        }

        if ("args" in instr) new_instructions.push({ ...instr, args: vnTable.vars2canonvars(instr.args) } as IBrilValueInstruction);
        else new_instructions.push({ ...instr } as IBrilValueInstruction);
      } else {
        // Effect operation
        // not a value instruction but still need to convert args
        if ("args" in instr && instr.args)
          new_instructions.push({ ...instr, args: vnTable.vars2canonvars(instr.args) } as IBrilValueInstruction);
        else new_instructions.push({ ...instr } as IBrilValueInstruction);
      }
    });

    // iterate through successors blocks phis
    successors[blockName].forEach((succName) => {
      blockMap[succName].instructions.every((instr) => {
        if (instr.op != "phi") return false; // break
        // replace phi args if they were calculated in blockName
        // debugger;
        for (let i = 0; i < instr.args.length; i++) {
          const arg = instr.args[i];
          if (!instr.labels) throw Error();
          const predecessor = instr.labels[i];
          if (predecessor != blockName || !vnTable.var2num[arg]) continue;
          instr.args[i] = vnTable.var2canonvar(arg);
        }
      });
    });

    blockMap[blockName].instructions = new_instructions;
    console.log(blockName, blockMap[blockName].instructions);

    const vnTableSize = vnTable.rows.length;

    // reverse post order of the successors of blockName that are in the dominance tree of blockName
    const orderedChildren = reversePostOrder(blockName, successors).filter((b) => domTree[blockName].includes(b));
    orderedChildren.forEach((childName) => dvnBlock(childName));

    // delete vnTable rows belonging to the child blocks
    // vnTable.rows.splice(Object.keys(pushed).length);
    vnTable.rows.splice(vnTableSize);
  };

  dvnBlock(Object.keys(blockMap)[0]);
};

const dvn2 = (func: IBrilFunction, blockMap: ICFGBlockMap, successors: IDictStrings, domTree: IDictStrings) => {
  const vnTable = new VNTable();

  // insert function args into lvntable
  func.args?.forEach((arg) => vnTable.addValue(new VNValue("input" + arg.name), arg.name));

  const dvnBlock = (blockName: string) => {
    const instrsToRemove: number[] = [];
    const instrsToReplace: Map<number, IBrilInstruction> = new Map();

    // process the phis at start of block
    // if meaningless or redundant mark the instruction for removal but don't delete yet as needs arg processing below
    // otherwise add to VNTable
    blockMap[blockName].instructions.forEach((instr, i) => {
      if (instr.op !== "phi") return; // phis come first
      debugger;
      const instrValue = vnTable.instruction2value(instr);
      if (isRemovablePhi(instr, vnTable)) instrsToRemove.push(i);
      else vnTable.addValue(instrValue, instr.dest);
    });

    blockMap[blockName].instructions.forEach((instr, i) => {
      // handle const operations
      if (instr.op == "const") {
        const instrValue = vnTable.instruction2value(instr);
        const instrValueNum = vnTable.value2num(instrValue);
        if (instrValueNum == -1) {
          // new const value, save in vnTable, keep instruction
          vnTable.addValue(instrValue, instr.dest, instr.value as number);
        } else {
          // existing const value, map instr.dest to this value, remove instruction
          vnTable.addVar(instr.dest, instrValueNum);
          instrsToRemove.push(i);
        }
      }

      // handle non-const non-phi value operations
      if ("dest" in instr && "args" in instr && instr.op !== "phi") {
        // map each arg to canonvar
        instr.args = vnTable.vars2canonvars(instr.args!);
        const instrValue = vnTable.instruction2value(instr);
        const instrValueNum = vnTable.value2num(instrValue);

        if (instrValueNum != -1) {
          // Common Subexpression Evaluation
          // existing value operation, map instr.dest to this value, remove instruction
          vnTable.addVar(instr.dest, instrValueNum);
          instrsToRemove.push(i);
        } else if (instr.op == "id" && vnTable.hasVar(instr.args[0])) {
          // Copy Propogation
          // new id operation, remove instr and replace with mapping to args[0]
          // y:int = call rnd
          // x:int = id y  ---> deleted, vnTable.var2num[x] = var2num[y]
          vnTable.addVar(instr.dest, vnTable.var2num[instr.args[0]]);
          instrsToRemove.push(i);
        } else {
          // new value operation
          // see if it can be folded
          const constValue = fold(vnTable, instrValue);
          if (typeof constValue !== "undefined") {
            // it can be folded, convert the instruction into a const
            const newConstInstr: IBrilConst = {
              op: "const",
              value: constValue,
              type: instr.type,
              pos: instr.pos,
              dest: instr.dest,
            };
            const newConstValue = vnTable.instruction2value(newConstInstr);
            vnTable.addValue(newConstValue, instr.dest);
            instrsToReplace.set(i, newConstInstr);
          } else {
            // unfoldable new value operation, add to vnTable
            vnTable.addValue(instrValue, instr.dest);
          }
        }
      }

      // handle effect operations
      else if ("args" in instr && instr.op !== "phi") {
        // and implicity "dest" not in instr
        // map each arg to canonvar
        instr.args = vnTable.vars2canonvars(instr.args!);
      }
    });

    // finished processing instructions

    // iterate through successors blocks phis
    successors[blockName].forEach((succName) => {
      blockMap[succName].instructions.every((instr) => {
        if (instr.op != "phi") return false; // break
        // replace phi args if they were calculated in blockName
        // debugger;
        for (let i = 0; i < instr.args.length; i++) {
          const arg = instr.args[i];
          if (!instr.labels) throw Error();
          const predecessor = instr.labels[i];
          if (predecessor != blockName || !vnTable.var2num[arg]) continue;
          instr.args[i] = vnTable.var2canonvar(arg);
        }
      });
    });

    // remove instructions marked for removal
    blockMap[blockName].instructions = blockMap[blockName].instructions.filter((b, i) => !instrsToRemove.includes(i));
    // replace instructions mapped for replacement (constant folds)
    instrsToReplace.forEach((value, key) => (blockMap[blockName].instructions[key] = value));

    console.log(blockName, blockMap[blockName].instructions);
    const vnTableSize = vnTable.rows.length;

    // reverse post order of the successors of blockName that are in the dominance tree of blockName
    const orderedChildren = reversePostOrder(blockName, successors).filter((b) => domTree[blockName].includes(b));
    orderedChildren.forEach((childName) => dvnBlock(childName));

    // delete vnTable rows belonging to the child blocks
    // vnTable.rows.splice(Object.keys(pushed).length);
    vnTable.rows.splice(vnTableSize);
  };

  dvnBlock(Object.keys(blockMap)[0]);
};

export const gvn = (func: IBrilFunction, blockMap: ICFGBlockMap) => {
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
  const domMap = getDominatorMap(successorsMap, Object.keys(blockMap)[0]);
  const domTree = getDominanceTree(domMap);
  dvn2(func, blockMap, successorsMap, domTree);
};
