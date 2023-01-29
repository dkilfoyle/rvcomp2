import _ from "lodash";
import {
  IAstArrayLiteralExpression,
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
  IAstLiteralExpression,
  IAstNonStringLiteralExpression,
  IAstProgram,
  IAstReturnStatement,
  IAstStatement,
  IAstStringLiteralExpression,
  IAstVariableDeclaration,
  IAstWhileStatement,
  IPos,
} from "../simpleC/ast";
import { BrilBuilder } from "./BrilBuilder";
import { IBrilProgram, IBrilType, IBrilValueInstruction } from "./BrilInterface";
import { lchownSync } from "fs";

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
    this.builder.calcDataSize();
    return this.builder.program;
  }

  functionDeclaration(node: IAstFunctionDeclaration) {
    const args = node.params.map((vd) => ({ name: vd.id, type: vd.type as IBrilType }));
    this.builder.buildFunction(node.id, args, node.type as IBrilType);

    if (node.block && node.block.statements) this.blockStatement(node.block); // node.block.statements.forEach((s) => this.statement(s));
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
        this.builder.buildEffectCall(
          n.id,
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
    if (node.size && _.isUndefined(node.initExpr)) {
      // array declaration without init, eg int[4] x;
      if (node.type == "int" || node.type == "bool" || node.type == "char") {
        this.builder.buildArray(node.id, node.type, node.size);
      } else debugger;
      return;
    }

    // Build and visit assignStatement for the initExpr if exists
    if (node.initExpr) {
      const assignNode: IAstAssignStatement = {
        _name: "assignStatement",
        lhs: { _name: "identifierExpression", id: node.id, type: node.type, pos: node.pos },
        rhs: node.initExpr,
      };
      this.assignStatement(assignNode);
      // if ((node.type == "int" || node.type == "bool") && _.isUndefined(node.size)) {
      //   const initInstr = this.builder.buildConst(node.initValue.value, node.type, false);
      //   initInstr.dest = node.id;
      //   this.builder.insert(initInstr);
      // } else this.builder.nop("variableDeclarationStatement: unsupported type");
    }
  }

  ifStatement(node: IAstIfStatement) {
    // Label names.
    let sfx = this.builder.freshSuffix();
    let thenLab = "then" + sfx;
    let elseLab = "else" + sfx;
    let endLab = "endif" + sfx;

    // branch
    const cond = this.expression(node.cond);
    this.builder.buildEffect("br", [cond.dest], undefined, [thenLab, elseLab]);

    this.builder.buildLabel(thenLab);
    this.statement(node.then);
    if (!this.builder.lastInstructionIsRet()) this.builder.buildEffect("jmp", [], undefined, [endLab]);

    this.builder.buildLabel(elseLab);
    if (node.else) this.statement(node.else);

    this.builder.buildLabel(endLab);
  }

  forStatement(node: IAstForStatement) {
    // for loop is just a while loop with a preceeding initiator and a per-loop statement at end of each cycle

    this.statement(node.init);

    let sfx = this.builder.freshSuffix();
    let fortestLab = "whiletest" + sfx;
    let forloopLab = "whilebody" + sfx;
    let endforLab = "endwhile" + sfx;

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
    node.heapVars.forEach((heapVarName) => {
      this.builder.buildEffect("free", [heapVarName]);
    });
  }

  returnStatement(node: IAstReturnStatement) {
    const lhs = node.lhs ? this.expression(node.lhs) : undefined;
    this.builder.buildEffect("ret", lhs ? [lhs.dest] : []);
  }

  assignStatement(node: IAstAssignStatement) {
    // possible assign forms
    // x = 5;          => x:int = const 5;
    // x[2] = 5;       => c5:int = const 5; p_x_2:ptr<int> = ptradd x c2; store p_x_2 c5;
    // x = y;          => x:int = id y;
    // x = j[1];       => c1:int = const 1; p_j_1:ptr<int> = ptradd j c1; x:int = load p_j_1;
    // int[2] x = [1,2];   => v.0:int = const 1; v.1:int = const 2; x:ptr<int> = alloc 3;  x_iter: ptr<int> = id x; store x_ind v.0; x_iter: ptr<int> = ptradd x_iter c1; ... repeat

    const rhs = this.expression(node.rhs, node.lhs);
  }

  // ==========================================================================================================
  // Expressions
  // ==========================================================================================================

  expression(node: IAstExpression, assignIDExpr?: IAstIdentifierExpression): IBrilValueInstruction {
    // dest is defined if coming directly from assign statement
    // eg x = 2 + 3
    let n, lhs, rhs;
    switch (node._name) {
      case "integerLiteralExpression":
      case "floatLiteralExpression":
      case "boolLiteralExpression":
        n = node as IAstNonStringLiteralExpression;
        return this.builder.buildConst(n.value, n.type, assignIDExpr);
      case "stringLiteralExpression":
        n = node as IAstStringLiteralExpression;
        return this.builder.buildString(n.value, assignIDExpr);
      case "arrayLiteralExpression":
        n = node as IAstArrayLiteralExpression;
        if (assignIDExpr) {
          const itemConsts = n.value.map((v) => this.expression(v));
          return this.builder.buildArrayLiteral(itemConsts, assignIDExpr);
        } else throw new Error("Array literal should only occur as assign - todo: fix parser");
      case "identifierExpression": // ie an identifier
        n = node as IAstIdentifierExpression;
        if (n.type == "string" || n.type == "void") throw new Error("String and void identifier type not implemented");
        return this.builder.buildIdentifier(n.id, n.type, n.index, assignIDExpr);
      case "intBinaryExpression":
      case "floatBinaryExpression":
        n = node as IAstBinaryExpression;
        lhs = this.expression(n.lhs);
        rhs = this.expression(n.rhs);
        return this.builder.buildValue(n.op, n.type as IBrilType, [lhs.dest, rhs.dest], undefined, undefined, assignIDExpr);
      case "functionCallExpression":
        n = node as IAstFunctionCallExpression;
        const params = n.params ? n.params.map((p) => this.expression(p)) : [];
        return this.builder.buildValueCall(
          n.id,
          params.map((p) => p.dest),
          n.type as IBrilType,
          assignIDExpr
        );
      case "invalidExpression":
        return this.builder.buildConst(0, "int");
      default:
        throw new Error(node.toString());
    }
  }

  comparisonExpression(node: IAstComparisonExpression, assignIDExpr?: IAstIdentifierExpression): IBrilValueInstruction {
    const lhs = this.expression(node.lhs);
    if (node.rhs) {
      const rhs = this.expression(node.rhs);
      return this.builder.buildValue(node.op, "bool", [lhs.dest, rhs.dest], undefined, undefined, assignIDExpr);
    } else {
      return lhs;
    }
  }
}

export const astToBrilVisitor = new AstToBrilVisitor();
