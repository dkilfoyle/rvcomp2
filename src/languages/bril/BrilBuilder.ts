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

  freshVar() {
    let out = "v" + this.nextFresh.toString();
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

  buildValue(op: IBrilValueOpCode, type: IBrilType, args: string[], funcs?: string[], labels?: string[], dest?: string) {
    dest = dest || this.freshVar();
    let instr: IBrilValueOperation = { op, dest, type, args, funcs, labels };
    this.insert(instr);
    return instr;
  }

  buildEffect(op: IBrilEffectOpCode, args: string[], funcs?: string[], labels?: string[]) {
    let instr: IBrilEffectOperation = { op, args, funcs, labels };
    this.insert(instr);
    return instr;
  }

  buildCall(func: string, args: string[], type: IBrilType, dest?: string): IBrilValueOperation;
  buildCall(func: string, args: string[], type?: undefined, dest?: string): IBrilEffectOperation;
  buildCall(func: string, args: string[], type?: IBrilType, dest?: string): IBrilOperation {
    if (type) {
      return this.buildValue("call", type, args, [func], undefined, dest);
    } else {
      return this.buildEffect("call", args, [func], undefined);
    }
  }

  buildConst(value: IBrilValueType, type: IBrilType, dest?: string) {
    dest = dest || this.freshVar();
    let instr: IBrilConst = { op: "const", value, dest, type };
    this.insert(instr);
    return instr;
  }

  buildLabel(name: string) {
    let label = { label: name };
    this.insert(label);
  }
}

export const brilBuilder = new BrilBuilder();
