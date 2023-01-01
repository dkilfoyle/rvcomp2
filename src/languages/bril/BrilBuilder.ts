import _ from "lodash";
import { IAstIdentifierExpression } from "../simpleC/ast";
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
} from "./BrilInterface";

export class BrilBuilder {
  public program: IBrilProgram = { functions: {}, key: 0 };
  public curFunction?: IBrilFunction;
  public nextFresh: number = 0;
  public keyIndex: number = 1;

  constructor() {}

  reset() {
    this.program = { functions: {}, key: 0 };
    this.curFunction = undefined;
    this.nextFresh = 0;
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

  buildValue(op: IBrilValueOpCode, type: IBrilType, args: string[], funcs?: string[], labels?: string[], insert = true) {
    const dest = this.freshVar(op);
    let instr: IBrilValueOperation = { op, dest, type, args, funcs, labels };
    if (insert) this.insert(instr);
    return instr;
  }

  buildArray(dest: string, type: IBrilType, sizeVar: string) {
    const instr: IBrilValueOperation = { op: "alloc", dest, type: { ptr: type }, args: [sizeVar] };
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

  buildArrayValue(type: IBrilType, id: string, index: number, insert = true) {
    const ptr = this.buildArrayReference(type, id, index);
    const dest = this.freshVar(id);
    let instrLoad: IBrilValueOperation = { op: "load", dest, type, args: [ptr] };
    if (insert) this.insert(instrLoad);
    return instrLoad;
  }

  buildIdentifier(dest: string, type: IBrilType, index: number | undefined, insert = true) {
    // return a dummy id instruction to reference dest but don't insert into function
    let instr: IBrilValueOperation;
    if (!_.isUndefined(index)) {
      instr = this.buildArrayValue(type, dest, index, insert);
      return instr;
    } else {
      instr = { op: "id", dest, type, args: [], funcs: [], labels: [] };
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

  buildValueCall(func: string, args: string[], type: IBrilType, insert = true): IBrilValueOperation {
    return this.buildValue("call", type, args, [func], undefined, insert);
  }

  buildConst(value: IBrilValueType, type: IBrilType, insert = true) {
    const dest = `c${value}`;
    let instr: IBrilConst = { op: "const", value, dest, type };
    if (insert) this.insert(instr);
    return instr;
  }

  buildLabel(name: string) {
    let label = { label: name };
    this.insert(label);
  }
}

export const brilBuilder = new BrilBuilder();
