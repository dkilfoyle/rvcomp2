import _ from "lodash";
import { IAstExpression, IAstIdentifierExpression } from "../simpleC/ast";
import {
  IBrilProgram,
  IBrilFunction,
  IBrilInstruction,
  IBrilLabel,
  IBrilValueOperation,
  IBrilArgument,
  IBrilValueOpCode,
  IBrilEffectOpCode,
  IBrilEffectOperation,
  IBrilOperation,
  IBrilConst,
  IBrilType,
  IBrilValueType,
  IBrilValueInstruction,
} from "./BrilInterface";

export class BrilBuilder {
  public program: IBrilProgram = {
    functions: {},
    key: 0,
    data: new Map<string, { offset: number; size: number; bytes: Uint8Array }>(),
    dataSize: 0,
  };
  public curFunction?: IBrilFunction;
  public nextFresh: number = 0;
  public keyIndex: number = 1;

  constructor() {}

  reset() {
    this.program = { functions: {}, key: 0, data: new Map<string, { offset: number; size: number; bytes: Uint8Array }>(), dataSize: 0 };
    this.curFunction = undefined;
    this.nextFresh = 1;
    this.keyIndex = 1;
  }

  freshVar(prefix = "v") {
    let out = prefix + this.nextFresh.toString();
    this.nextFresh += 1;
    return out;
  }

  freshSuffix() {
    let out = "." + this.nextFresh.toString();
    this.nextFresh += 1;
    return out;
  }

  insert(instr: IBrilInstruction | IBrilLabel) {
    if (!this.curFunction) throw "bla";
    instr.key = this.keyIndex++;
    this.curFunction.instrs.push(instr);
    return instr;
  }

  nop(label: string) {
    this.insert({ op: "nop", labels: [label] } as IBrilValueOperation);
  }

  buildFunction(name: string, args: IBrilArgument[], type?: IBrilType) {
    let func: IBrilFunction;
    if (type === undefined) {
      func = { name: name, instrs: [], args: args };
    } else {
      func = { name: name, instrs: [], args: args, type: type };
    }
    func.key = this.keyIndex++;
    this.program.functions[name] = func;
    this.curFunction = func;
    this.nextFresh = 0;
    return func;
  }

  buildValue(
    op: IBrilValueOpCode,
    type: IBrilType,
    args: string[],
    funcs?: string[],
    labels?: string[],
    assignIDExpr?: IAstIdentifierExpression
  ) {
    let instr: IBrilValueOperation = { op, dest: this.freshVar(op), type, args, funcs, labels };
    this.insertValueInstruction(instr, assignIDExpr);
    return instr;
  }

  buildArray(dest: string, type: IBrilType, sizeVar: number) {
    if (sizeVar < 1) throw new Error();
    const sizeInstr = this.buildConst(sizeVar, "int");
    const instr: IBrilValueOperation = { op: "alloc", dest, type: { ptr: type }, args: [sizeInstr.dest] };
    this.insert(instr);
    return instr;
  }

  buildArrayReference(type: IBrilType, id: string, index: number) {
    const indexConst = this.buildConst(index, "int");
    const ptrDest = `p_${id}_${index}`;
    let instrPtr: IBrilValueOperation = { op: "ptradd", dest: ptrDest, type: { ptr: type }, args: [id, indexConst.dest] };
    this.insert(instrPtr);
    return ptrDest;
  }

  buildArrayGetValue(type: IBrilType, id: string, index: number, assignIDExpr?: IAstIdentifierExpression) {
    const ptr = this.buildArrayReference(type, id, index);
    const dest = assignIDExpr ? assignIDExpr.id : this.freshVar(id);
    let instrLoad: IBrilValueOperation = { op: "load", dest, type, args: [ptr] };
    this.insert(instrLoad);
    return instrLoad;
  }

  buildArraySetValue(type: IBrilType, id: string, index: number) {
    throw new Error();
  }

  buildArrayLiteral(valueInstrs: IBrilValueInstruction[], assignIDExpr: IAstIdentifierExpression) {
    // int[3] x = [10, a, b+c];
    // or int[3] x; x = [10, a, b+c];

    // prerequiste: c10:int = const 10; a:int = ?, add4:int = add a b;
    // input valueInstrs = [c10, a, add4]
    // x:ptr<int> = alloc 3;
    // x_iter: ptr<int> = id x;
    // forEach valueInstr in valueInstrs
    //   store x_iter valueInstr.dest;
    //   x_iter: ptr<int> = ptradd x_iter c1;

    const id = assignIDExpr.id;
    const type = valueInstrs[0].type;
    const base = this.buildArray(id, type, valueInstrs.length);
    // x:ptr<type> = alloc items.length

    const one = this.buildConst(1, "int");
    const iterptr: IBrilValueOperation = { op: "id", type: { ptr: type }, args: [base.dest], dest: this.freshVar(id + "iter") };
    this.insert(iterptr);
    // x_iter: ptr<int> = id x;

    const incrPtrInstr: IBrilValueOperation = { op: "ptradd", dest: iterptr.dest, type: { ptr: type }, args: [iterptr.dest, one.dest] };

    valueInstrs.forEach((valueInstr, i) => {
      this.buildEffect("store", [iterptr.dest, valueInstr.dest]);
      // store xiter valueInstr.dest;
      this.insert(incrPtrInstr);
      // x_iter: ptr<int> = ptradd x_iter c1;
    });
    return base;
  }

  buildIdentifier(dest: string, type: IBrilType, index: number | undefined, assignIDExpr?: IAstIdentifierExpression) {
    // return a dummy id instruction to reference dest but don't insert into function
    let instr: IBrilValueOperation;
    if (!_.isUndefined(index)) {
      // eg x =j[5]
      instr = this.buildArrayGetValue(type, dest, index, assignIDExpr);
      return instr;
    } else {
      instr = { op: "id", dest, type, args: [], funcs: [], labels: [] };
      if (assignIDExpr) {
        instr.args = [dest];
        this.insertValueInstruction(instr, assignIDExpr);
      }
      return instr;
    }
  }

  buildEffect(op: IBrilEffectOpCode, args: string[], funcs?: string[], labels?: string[]) {
    let instr: IBrilEffectOperation = { op, args, funcs, labels };
    this.insert(instr);
    return instr;
  }

  buildEffectCall(func: string, args: string[]): IBrilEffectOperation {
    return this.buildEffect("call", args, [func], undefined);
  }

  buildValueCall(func: string, args: string[], type: IBrilType, assignIDExpr?: IAstIdentifierExpression): IBrilValueOperation {
    return this.buildValue("call", type, args, [func], undefined, assignIDExpr);
  }

  insertValueInstruction(instr: IBrilValueInstruction, assignIDExpr?: IAstIdentifierExpression) {
    if (assignIDExpr) {
      if (_.isUndefined(assignIDExpr.index)) {
        // processing lhs = value
        // eg j = x + y;
        instr.dest = assignIDExpr.id;
        // assign instr dest directly to lhs
        // int j: = add x y
        this.insert(instr);
      } else {
        // processing lhs[2] = value
        if (instr.op !== "id") this.insert(instr); // using default dest
        // eg j[2] = 10;
        // eg const: int:c10 = const 10;
        // eg value: int:opadd = add x y

        const offsetDest = this.buildArrayReference(assignIDExpr.type as IBrilType, assignIDExpr.id, assignIDExpr.index);
        // p_j_2:ptr<int> = ptradd j c2;
        // offsetDest = "p_j_2"

        const storeInstr = this.buildEffect("store", [offsetDest, instr.dest]);
        // store p_j_1 c10;
      }
    } else {
      // const as part of expression
      // eg 2 + ....
      // c10:int = const 10;
      if (instr.op !== "id") this.insert(instr);
    }
    return instr;
  }

  buildConst(value: IBrilValueType, type: IBrilType, assignIDExpr?: IAstIdentifierExpression) {
    const constInstr: IBrilConst = { op: "const", value, dest: `c${value}`, type };
    this.insertValueInstruction(constInstr, assignIDExpr);
    return constInstr;
  }

  buildString(strvalue: string, assignIDExpr?: IAstIdentifierExpression) {
    const constInstr: IBrilConst = {
      op: "const",
      value: this.dataOffsetForValue("char", strvalue).offset,
      dest: this.freshVar("pchar"),
      type: { ptr: "char" },
    };
    this.insertValueInstruction(constInstr, assignIDExpr);
    return constInstr;
  }

  buildLabel(name: string) {
    let label = { label: name };
    this.insert(label);
  }

  lastInstructionIsRet() {
    if (this.curFunction && this.curFunction.instrs.length) {
      const lastInstr = this.curFunction.instrs[this.curFunction.instrs.length - 1];
      if ("op" in lastInstr) return lastInstr.op == "ret";
    }
    return false;
  }

  dataOffsetForValue = (type: IBrilType, value: IBrilValueType) => {
    if (type !== "char") throw new Error("Only string data supported");
    const stringvalue = value.toString();
    if (!this.program.data.has(stringvalue)) {
      const lastentry = this.program.data.size ? Array.from(this.program.data)[this.program.data.size - 1][1] : { offset: 10240, size: 0 };
      const bytes = new TextEncoder().encode(stringvalue + "\0");
      this.program.data.set(stringvalue, { offset: lastentry.offset + lastentry.size, size: bytes.length, bytes });
    }
    return this.program.data.get(stringvalue)!;
  };

  calcDataSize = () => {
    this.program.dataSize = Array.from(this.program.data).reduce((accum, cur) => (accum += cur[1].size), 0);
  };
}

export const brilBuilder = new BrilBuilder();
