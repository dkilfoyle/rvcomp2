import { IBrilConst, IBrilFunction, IBrilInstruction, IBrilProgram, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
import { getCfgEdges, ICFGBlockMap } from "./cfg";
import { getDominanceTree, getDominatorMap } from "./dom";
import { IDictNumber, IDictNumbers, IDictStrings } from "./utils";
import { fold, VNTable, VNValue } from "./vn";

// Global Value Numbering
// 1. Remove meaningless phi nodes
// 2. Remove redundant phi nodes
// 3. Constant propogation
// 4. Common subexpression evaluation
// 5. Copy propogation
// 6. Constant folding

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

  const stats = {
    removed: 0,
    fold: 0,
    cse: 0,
    cpprop: 0,
    conprop: 0,
    phi: 0,
  };

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
      const instrValue = vnTable.instruction2value(instr);
      if (isRemovablePhi(instr, vnTable)) {
        instrsToRemove.push(i);
        stats.phi++;
      } else vnTable.addValue(instrValue, instr.dest);
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
          // Constant propogation
          // existing const value, map instr.dest to this value, remove instruction
          vnTable.addVar(instr.dest, instrValueNum);
          instrsToRemove.push(i);
          stats.conprop++;
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
          // a:int = add b c
          // ...
          // x:int = add b c --> deleted, map x -> a, future references of x will be replaced by canoonical form "a"
          // existing value operation, map instr.dest to this value, remove instruction
          vnTable.addVar(instr.dest, instrValueNum);
          instrsToRemove.push(i);
          stats.cse++;
        } else if (instr.op == "id" && vnTable.hasVar(instr.args[0])) {
          // Copy Propogation
          // y:int = call rnd
          // x:int = id y  ---> deleted, map x to canonical form of y
          // vnTable.var2num[x] = var2num[y]
          vnTable.addVar(instr.dest, vnTable.var2num[instr.args[0]]);
          instrsToRemove.push(i);
          stats.cpprop++;
        } else {
          // new value operation, see if it can be folded
          // Constant folding
          // a:int = const 2;
          // b:int = const 3;
          // c:int = add a b --> replace with c:int = const 5;
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
            stats.fold++;
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

    stats.removed += instrsToRemove.length;

    // remove instructions marked for removal
    blockMap[blockName].instructions = blockMap[blockName].instructions.filter((b, i) => !instrsToRemove.includes(i));
    // replace instructions mapped for replacement (constant folds)
    instrsToReplace.forEach((value, key) => (blockMap[blockName].instructions[key] = value));

    // console.log(blockName, blockMap[blockName].instructions);
    const vnTableSize = vnTable.rows.length;

    // reverse post order of the successors of blockName that are in the dominance tree of blockName
    const orderedChildren = reversePostOrder(blockName, successors).filter((b) => domTree[blockName].includes(b));
    orderedChildren.forEach((childName) => dvnBlock(childName));

    // delete vnTable rows belonging to the child blocks
    // vnTable.rows.splice(Object.keys(pushed).length);
    vnTable.rows.splice(vnTableSize);
  };

  dvnBlock(Object.keys(blockMap)[0]);
  return stats;
};

export const gvn = (func: IBrilFunction, blockMap: ICFGBlockMap) => {
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
  const domMap = getDominatorMap(successorsMap, Object.keys(blockMap)[0]);
  const domTree = getDominanceTree(domMap);
  return dvn(func, blockMap, successorsMap, domTree);
};
