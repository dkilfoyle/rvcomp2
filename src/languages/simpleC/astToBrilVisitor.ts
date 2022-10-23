import {
  IAstAdditionExpression,
  IAstAssignStatement,
  IAstExpression,
  IAstFunctionDeclaration,
  IAstIntegerLiteralExpression,
  IAstProgram,
  IAstStatement,
  IAstVariableDeclaration,
  IPos,
} from "./ast";

type IBrilValueType = number | boolean;
type IBrilPrimType = "int" | "bool" | "float";
type IBrilParamType = { ptr: IBrilType };
type IBrilType = IBrilPrimType | IBrilParamType;

interface IBrilOp {
  args?: string[];
  funcs?: string[];
  labels?: string[];
  pos?: IPos;
}

export interface IBrilEffectOperation extends IBrilOp {
  op: "br" | "jmp" | "ret" | "call" | "print";
}

export interface IBrilValueOperation extends IBrilOp {
  op: "add" | "sub" | "mul" | "div" | "call" | "id" | "nop" | "phi";
  dest: string;
  type: IBrilType;
}

export type IBrilValueOpCode = IBrilValueOperation["op"];
export type IBrilEffectOpCode = IBrilEffectOperation["op"];

export interface IBrilConst {
  op: "const";
  value: IBrilValueType;
  dest: string;
  type: IBrilType;
  pos?: IPos;
}

export type IBrilOperation = IBrilValueOperation | IBrilEffectOperation;
export type IBrilInstruction = IBrilOperation | IBrilConst;
export type IBrilValueInstruction = IBrilConst | IBrilValueOperation;

interface IBrilLabel {
  label: string;
  pos?: IPos;
}

interface IBrilArgument {
  name: string;
  type: IBrilType;
}

interface IBrilFunction {
  name: string;
  args?: IBrilArgument[];
  type?: IBrilType;
  instrs: (IBrilInstruction | IBrilLabel)[];
  pos?: IPos;
}

export interface IBrilProgram {
  functions: IBrilFunction[];
}

class BrilBuilder {
  public program: IBrilProgram = { functions: [] };
  public curFunction?: IBrilFunction;
  public nextFresh: number = 0;

  constructor() {}

  reset() {
    this.program = { functions: [] };
    this.curFunction = undefined;
    this.nextFresh = 0;
  }

  freshVar() {
    let out = "v" + this.nextFresh.toString();
    this.nextFresh += 1;
    return out;
  }

  insert(instr: IBrilInstruction | IBrilLabel) {
    if (!this.curFunction) throw "bla";
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
    this.program.functions.push(func);
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
}

class AstToBrilVisitor {
  public builder: BrilBuilder = new BrilBuilder();

  constructor() {}

  visit(node: IAstProgram): IBrilProgram {
    this.builder.reset();
    for (let fd of node.functionDeclarations) {
      this.functionDeclaration(fd);
    }
    return this.builder.program;
  }

  functionDeclaration(node: IAstFunctionDeclaration) {
    const args = node.params.map((vd) => ({ name: vd.id, type: vd.type as IBrilType }));
    this.builder.buildFunction(node.id, args, node.type as IBrilType);

    if (node.block) node.block.statements.forEach((s) => this.statement(s));
  }

  statement(node: IAstStatement) {
    switch (node._name) {
      case "assignStatement":
        this.assignStatement(node as IAstAssignStatement);
        break;
      case "variableDeclaration":
        this.variableDeclarationStatement(node as IAstVariableDeclaration);
        break;
      case "expressionStatement":
        // this.additionExpression(node as IAstAdditionExpression);
        break;
      default:
        this.builder.nop(node._name);
        break;
    }
  }

  variableDeclarationStatement(node: IAstVariableDeclaration) {
    if (node.initValue) {
      if (node.type == "int" || node.type == "bool") this.builder.buildConst(node.initValue.value, node.type, node.id);
      else this.builder.nop("variableDeclarationStatement: unsupported type");
    }
  }

  assignStatement(node: IAstAssignStatement) {
    const rhs = this.expression(node.rhs);
    return this.builder.buildValue("id", node.lhs.type as IBrilType, [rhs.dest], undefined, undefined, node.lhs.id);
  }

  expression(node: IAstExpression): IBrilValueInstruction {
    let n, lhs, rhs;
    switch (node._name) {
      case "integerLiteralExpression":
        n = node as IAstIntegerLiteralExpression;
        return this.builder.buildConst(n.value, n.type);
      case "binaryExpression":
        n = node as IAstAdditionExpression;
        lhs = this.expression(n.lhs);
        rhs = this.expression(n.rhs);
        return this.builder.buildValue(n.op, n.type as IBrilType, [lhs.dest, rhs.dest], undefined, undefined);
      default:
        throw Error();
    }
  }
}

export const astToBrilVisitor = new AstToBrilVisitor();
