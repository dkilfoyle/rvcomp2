import {
  IAstAssignStatement,
  IAstBoolLiteralExpression,
  IAstFunctionDeclaration,
  IAstIntegerLiteralExpression,
  IAstNode,
  IAstProgram,
  IAstStatement,
  IAstVariableDeclaration,
} from "./ast";

type IBrilType = "bool" | "int";

interface IBrilVariableDeclaration {
  name: string;
  type: IBrilType;
}

interface IBrilFunction {
  name: string;
  args: IBrilVariableDeclaration[];
  type: IBrilType;
  instrs: IBrilInstruction[];
}

type IBrilInstruction = IBrilOperation | IBrilLabel;

interface IBrilOperation {
  op: string;
}

interface IBrilConstOperation extends IBrilOperation {
  op: "const";
  dest: string;
  type: IBrilType;
  value: number | boolean;
}

type IBrilValueOp = "add" | "sub" | "mul" | "div" | "eq" | "lt" | "gt" | "le" | "ge" | "not" | "and" | "or";

interface IBrilValueOperation extends IBrilOperation {
  op: IBrilValueOp;
  dest: string;
  type: IBrilType;
  args?: string[];
  funcs?: string[];
  labels?: string[];
}

type IBrilEffectOp = "jmp" | "br" | "call" | "ret";

interface IBrilEffectOperation extends IBrilOperation {
  op: IBrilEffectOp;
  args?: string[];
  funcs?: string[];
  labels?: string[];
}

interface IBrilLabel {
  label: string;
}

interface IBrilProgram {
  functions: IBrilFunction[];
}

class AstToBrilVisitor {
  public bril: IBrilProgram = { functions: [] };
  constructor() {}
  go(node: IAstProgram): IBrilProgram {
    for (let fd of node.functionDeclarations) {
      this.bril.functions.push(this.functionDeclaration(fd));
    }
    return this.bril;
  }
  functionDeclaration(node: IAstFunctionDeclaration): IBrilFunction {
    return {
      name: node.id,
      type: node.type as IBrilType,
      args: node.params.map((vd) => ({ name: vd.id, type: vd.type as IBrilType })),
      instrs: node.block ? node.block?.statements.map((s) => this.statement(s)) : [],
    };
  }
  statement(node: IAstStatement): IBrilInstruction {
    switch (node._name) {
      case "assignStatement":
        return this.assignStatement(node as IAstAssignStatement);
      case "variableDeclarationStatement":
        return this.variableDeclarationStatement(node as IAstVariableDeclaration);
      // case "ifStatement":
      //   return this.ifStatement(node);
      default:
        throw new Error();
    }
  }
  assignStatement(node: IAstAssignStatement) {
    switch (node.rhs._name) {
      case "integerLiteralExpression": {
        const rhs = node.rhs as IAstIntegerLiteralExpression;
        return {
          op: "const",
          dest: node.lhs.id,
          type: "int",
          value: rhs.value,
        } as IBrilConstOperation;
      }
      case "boolLiteralExpression": {
        const rhs = node.rhs as IAstBoolLiteralExpression;
        return {
          op: "const",
          dest: node.lhs.id,
          type: "bool",
          value: rhs.value,
        } as IBrilConstOperation;
      }
      default:
        throw new Error();
    }
  }
  variableDeclarationStatement(node: IAstVariableDeclaration) {
    return {
      op: "eq",
      dest: node.id,
      type: node.type,
    } as IBrilValueOperation;
  }
}

export const astToBrilVisitor = new AstToBrilVisitor();
