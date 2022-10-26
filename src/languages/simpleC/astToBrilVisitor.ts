import { ThemeProvider } from "@emotion/react";
import {
  IAstAssignStatement,
  IAstBinaryExpression,
  IAstBlock,
  IAstComparisonExpression,
  IAstExpression,
  IAstForStatement,
  IAstFunctionCallExpression,
  IAstFunctionDeclaration,
  IAstIdentifierExpression,
  IAstIfStatement,
  IAstIntegerLiteralExpression,
  IAstProgram,
  IAstReturnStatement,
  IAstStatement,
  IAstVariableDeclaration,
  IPos,
} from "./ast";

type IBrilValueType = number | boolean;
type IBrilPrimType = "int" | "bool" | "float";
type IBrilParamType = { ptr: IBrilType };
type IBrilType = IBrilPrimType | IBrilParamType;

interface IBrilOp extends IBrilNode {
  args?: string[];
  funcs?: string[];
  labels?: string[];
  pos?: IPos;
}

export interface IBrilEffectOperation extends IBrilOp {
  op: "br" | "jmp" | "ret" | "call" | "print";
}

export interface IBrilValueOperation extends IBrilOp {
  op: "add" | "sub" | "mul" | "div" | "call" | "id" | "nop" | "phi" | "eq" | "lt" | "gt" | "ge" | "le" | "not" | "and" | "or";
  dest: string;
  type: IBrilType;
}

export type IBrilValueOpCode = IBrilValueOperation["op"];
export type IBrilEffectOpCode = IBrilEffectOperation["op"];

export interface IBrilConst extends IBrilNode {
  op: "const";
  value: IBrilValueType;
  dest: string;
  type: IBrilType;
  pos?: IPos;
}

export type IBrilOperation = IBrilValueOperation | IBrilEffectOperation;
export type IBrilInstruction = IBrilOperation | IBrilConst;
export type IBrilValueInstruction = IBrilConst | IBrilValueOperation;

interface IBrilLabel extends IBrilNode {
  label: string;
  pos?: IPos;
}

interface IBrilArgument {
  name: string;
  type: IBrilType;
}

interface IBrilFunction extends IBrilNode {
  name: string;
  args?: IBrilArgument[];
  type?: IBrilType;
  instrs: (IBrilInstruction | IBrilLabel)[];
  pos?: IPos;
}

export interface IBrilNode {
  key?: number;
}

export interface IBrilProgram extends IBrilNode {
  functions: IBrilFunction[];
}

class BrilBuilder {
  public program: IBrilProgram = { functions: [], key: 0 };
  public curFunction?: IBrilFunction;
  public nextFresh: number = 0;
  public keyIndex: number = 1;

  constructor() {}

  reset() {
    this.program = { functions: [], key: 0 };
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

  buildLabel(name: string) {
    let label = { label: name };
    this.insert(label);
  }
}

class BrilPrinter {
  public hr: string = "";
  line(l: string) {
    this.hr = this.hr + l + "\n";
  }
  print(bril: IBrilProgram) {
    this.hr = "";
    bril.functions.forEach((fn) => this.printFunction(fn));
    return this.hr;
  }
  formatArgument(arg: IBrilArgument) {
    return `${arg.name}: ${arg.type}`;
  }
  printFunction(fn: IBrilFunction) {
    const args = fn.args ? "(" + fn.args.map((arg) => this.formatArgument(arg)).join(", ") + ")" : "";
    const kind = fn.type ? `: ${fn.type}` : "";
    this.line(`@${fn.name}${args}${kind} {`);
    fn.instrs.forEach((instr) => this.printInstruction(instr));
    this.line("}");
  }
  printInstruction(ins: IBrilInstruction | IBrilLabel) {
    if ((<IBrilInstruction>ins).op) {
      ins = ins as IBrilInstruction;
      if (ins.op === "const") this.line(`  ${ins.dest}: ${ins.type} = const ${ins.value};`);
      else {
        let rhs = `${ins.op}`;
        if (ins.funcs) rhs += ` ${ins.funcs.join(" @")}`;
        if (ins.args) rhs += ` ${ins.args.join(" ")}`;
        if (ins.labels) rhs += ` .${ins.labels.join(" .")}`;
        const insAsValue = ins as IBrilValueInstruction;
        if (insAsValue.dest) {
          let tyann = `: ${insAsValue.type}`;
          this.line(`  ${insAsValue.dest}${tyann} = ${rhs}`);
        } else return this.line(`  ${rhs}`);
      }
    } else {
      // label
      ins = ins as IBrilLabel;
      this.line(`.${ins.label}:`);
    }
  }
}

export const brilPrinter = new BrilPrinter();

class AstToBrilVisitor {
  public builder: BrilBuilder = new BrilBuilder();
  public inExpressionStatement = false;

  constructor() {}

  reset() {
    this.inExpressionStatement = false;
  }

  visit(node: IAstProgram): IBrilProgram {
    this.builder.reset();
    this.reset();
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

  // ==========================================================================================================
  // Statements
  // ==========================================================================================================

  statement(node: IAstStatement) {
    switch (node._name) {
      case "assignStatement":
        this.assignStatement(node as IAstAssignStatement);
        break;
      case "variableDeclaration":
        this.variableDeclarationStatement(node as IAstVariableDeclaration);
        break;
      case "ifStatement":
        this.ifStatement(node as IAstIfStatement);
        break;
      case "forStatement":
        this.forStatement(node as IAstForStatement);
        break;
      case "expressionStatement":
        this.inExpressionStatement = true;
        this.expression(node as IAstExpression);
        this.inExpressionStatement = false;
        break;
      case "returnStatement":
        this.returnStatement(node as IAstReturnStatement);
        break;
      case "blockStatement":
        this.blockStatement(node as IAstBlock);
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

  ifStatement(node: IAstIfStatement) {
    // Label names.
    let sfx = this.builder.freshSuffix();
    let thenLab = "then" + sfx;
    let elseLab = "else" + sfx;
    let endLab = "endif" + sfx;

    // branch
    const cond = this.comparisonExpression(node.cond);
    this.builder.buildEffect("br", [cond.dest], undefined, [thenLab, elseLab]);

    this.builder.buildLabel(thenLab);
    this.statement(node.then);
    this.builder.buildEffect("jmp", [], undefined, [endLab]);

    this.builder.buildLabel(elseLab);
    if (node.else) this.statement(node.else);

    this.builder.buildLabel(endLab);
  }

  forStatement(node: IAstForStatement) {
    this.statement(node.init);

    let sfx = this.builder.freshSuffix();
    let fortestLab = "fortest" + sfx;
    let forloopLab = "forloop" + sfx;
    let endforLab = "endfor" + sfx;

    this.builder.buildLabel(fortestLab);
    const test = this.comparisonExpression(node.test);

    this.builder.buildEffect("br", [test.dest], undefined, [forloopLab, endforLab]);

    this.builder.buildLabel(forloopLab);
    this.statement(node.loop);
    this.statement(node.step);
    this.builder.buildEffect("jmp", [], undefined, [fortestLab]);

    this.builder.buildLabel(endforLab);
  }

  blockStatement(node: IAstBlock) {
    node.statements.forEach((s) => this.statement(s));
  }

  returnStatement(node: IAstReturnStatement) {
    const lhs = this.expression(node.lhs);
    this.builder.buildEffect("ret", [lhs.dest]);
  }

  // ==========================================================================================================
  // Expressions
  // ==========================================================================================================

  expression(node: IAstExpression): IBrilValueInstruction {
    let n, lhs, rhs;
    switch (node._name) {
      case "integerLiteralExpression":
        n = node as IAstIntegerLiteralExpression;
        return this.builder.buildConst(n.value, n.type);
      case "identifierExpression": // ie an identifier
        n = node as IAstIdentifierExpression;
        return this.builder.buildValue("id", n.type as IBrilType, [n.id]);
      case "binaryExpression":
        n = node as IAstBinaryExpression;
        lhs = this.expression(n.lhs);
        rhs = this.expression(n.rhs);
        return this.builder.buildValue(n.op, n.type as IBrilType, [lhs.dest, rhs.dest], undefined, undefined);
      case "functionCallExpression":
        n = node as IAstFunctionCallExpression;
        const params = n.params ? n.params.map((p) => this.expression(p)) : [];
        if (this.inExpressionStatement) {
          this.builder.buildCall(
            n.id,
            params.map((p) => p.dest),
            n.type as IBrilType
          );
          return this.builder.buildConst(0, "int");
        } else {
          return this.builder.buildCall(
            n.id,
            params.map((p) => p.dest),
            n.type as IBrilType
          );
        }

      default:
        throw new Error(node.toString());
    }
  }

  comparisonExpression(node: IAstComparisonExpression): IBrilValueInstruction {
    const lhs = this.expression(node.lhs);
    const rhs = this.expression(node.rhs);
    return this.builder.buildValue(node.op, "bool", [lhs.dest, rhs.dest]);
  }
}

export const astToBrilVisitor = new AstToBrilVisitor();
