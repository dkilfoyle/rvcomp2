import {
  IAstAssignStatement,
  IAstBinaryExpression,
  IAstBlock,
  IAstBoolLiteralExpression,
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
  IAstWhileStatement,
  IPos,
} from "../simpleC/ast";
import { BrilBuilder } from "./BrilBuilder";
import { IBrilProgram, IBrilType, IBrilValueInstruction } from "./BrilInterface";

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

    if (node.block && node.block.statements) node.block.statements.forEach((s) => this.statement(s));
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
      case "whileStatement":
        this.whileStatement(node as IAstWhileStatement);
        break;
      // case "expressionStatement":
      case "functionCallExpression":
        const n = node as IAstFunctionCallExpression;
        const params = n.params ? n.params.map((p) => this.expression(p)) : [];
        this.builder.buildCall(
          "@" + n.id,
          params.map((p) => p.dest)
        );
        break;
      case "returnStatement":
        this.returnStatement(node as IAstReturnStatement);
        break;
      case "blockStatement":
        this.blockStatement(node as IAstBlock);
        break;
      default:
        debugger;
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
    // if (node.rhs._name == "integerLiteralExpression") {
    //   const n = node.rhs as IAstIntegerLiteralExpression;
    //   return this.builder.buildConst(n.value, n.type, node.lhs.id);
    // } else {
    //   const rhs = this.expression(node.rhs);
    //   return this.builder.buildValue("id", node.lhs.type as IBrilType, [rhs.dest], undefined, undefined, node.lhs.id);
    // }
    this.expression(node.rhs, node.lhs.id);
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

  whileStatement(node: IAstWhileStatement) {
    let sfx = this.builder.freshSuffix();
    let whiletestLab = "whiletest" + sfx;
    let whilebodyLab = "whilebody" + sfx;
    let whileendLab = "whileend" + sfx;

    this.builder.buildLabel(whiletestLab);
    const test = this.comparisonExpression(node.test);

    this.builder.buildEffect("br", [test.dest], undefined, [whilebodyLab, whileendLab]);

    this.builder.buildLabel(whilebodyLab);
    this.statement(node.loop);
    this.builder.buildEffect("jmp", [], undefined, [whiletestLab]);

    this.builder.buildLabel(whileendLab);
  }

  blockStatement(node: IAstBlock) {
    node.statements.forEach((s) => this.statement(s));
  }

  returnStatement(node: IAstReturnStatement) {
    const lhs = node.lhs ? this.expression(node.lhs) : undefined;
    this.builder.buildEffect("ret", lhs ? [lhs.dest] : []);
  }

  // ==========================================================================================================
  // Expressions
  // ==========================================================================================================

  expression(node: IAstExpression, dest: string | undefined = undefined): IBrilValueInstruction {
    // dest is defined if coming directly from assign statement
    // eg x = 2 + 3
    let n, lhs, rhs;
    switch (node._name) {
      case "integerLiteralExpression":
        n = node as IAstIntegerLiteralExpression;
        return this.builder.buildConst(n.value, n.type, dest);
      case "boolLiteralExpression":
        n = node as IAstBoolLiteralExpression;
        return this.builder.buildConst(n.value, n.type, dest);
      case "identifierExpression": // ie an identifier
        n = node as IAstIdentifierExpression;
        return { op: "id", dest: n.id, args: [], type: "int" }; // this.builder.buildValue("id", n.type as IBrilType, [n.id]);
      case "binaryExpression":
        n = node as IAstBinaryExpression;
        lhs = this.expression(n.lhs);
        rhs = this.expression(n.rhs);
        return this.builder.buildValue(n.op, n.type as IBrilType, [lhs.dest, rhs.dest], undefined, undefined, dest);
      case "functionCallExpression":
        n = node as IAstFunctionCallExpression;
        const params = n.params ? n.params.map((p) => this.expression(p)) : [];
        return this.builder.buildCall(
          n.id,
          params.map((p) => p.dest),
          n.type as IBrilType,
          dest
        );
      case "invalidExpression":
        return this.builder.buildConst(0, "int");
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
