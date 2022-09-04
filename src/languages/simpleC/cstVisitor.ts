import { IToken } from "chevrotain";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import parser from "./parser";
import {
  AssignExpressionCstChildren,
  BlockStatementCstChildren,
  ExpressionCstChildren,
  ExpressionStatementCstChildren,
  FunctionDeclarationCstChildren,
  FunctionDeclarationCstNode,
  ProgramCstChildren,
  ProgramCstNode,
  StatementCstChildren,
  VariableDeclarationStatementCstChildren,
} from "./simpleC";

const CstBaseVisitor = parser.parserInstance.getBaseCstVisitorConstructor();

interface Scope {
  name: string;
  ids: string[];
  parent: Scope | undefined;
  children: Scope[];
}

class CstVisitor extends CstBaseVisitor {
  public errors: ISimpleCLangError[];
  public scopeStack: Scope;
  public currentScope: Scope;

  constructor() {
    super();
    this.validateVisitor();
    this.errors = [];
    this.scopeStack = { name: "global", parent: undefined, ids: [], children: [] };
    this.currentScope = this.scopeStack;
  }
  reset() {
    this.errors = [];
    this.scopeStack = { name: "global", parent: undefined, ids: [], children: [] };
    this.currentScope = this.scopeStack;
  }

  pushScope(name: string) {
    const newScope = { name, parent: this.currentScope, ids: [], children: [] };
    if (this.currentScope) this.currentScope.children.push(newScope);
    this.currentScope = newScope;
  }
  popScope() {
    if (this.currentScope.parent) this.currentScope = this.currentScope.parent;
  }
  inScope(testid: string, scope = this.currentScope): boolean {
    const found = scope.ids.find((id) => id == testid);
    if (found) return true;
    if (scope.parent) return this.inScope(testid, scope.parent);
    else return false;
  }

  pushError(message: string, token: IToken) {
    this.errors.push({
      startColumn: token.startColumn || 0,
      startLineNumber: token.startLine || 0,
      endColumn: (token.endColumn || 0) + 1,
      endLineNumber: token.endLine || 0,
      code: "3",
      message,
    });
  }

  program(ctx: ProgramCstChildren) {
    this.reset();
    const functionDeclarations = ctx.functionDeclaration?.map((node) => this.visit(node)) || [];
    const rootLevelStatements = ctx.statement?.map((node) => this.visit(node)) || [];
    return { _name: "program", functionDeclarations, rootLevelStatements, scopeStack: this.scopeStack, errors: this.errors };
  }
  functionDeclaration(ctx: FunctionDeclarationCstChildren) {
    const id = ctx.ID[0].image;
    this.currentScope.ids.push(id);
    this.pushScope(id);

    const parameters = ctx.parameterList ? this.visit(ctx.parameterList) : [];
    const block = this.visit(ctx.blockStatement);

    this.popScope();

    return {
      _name: "functionDeclaration",
      id,
      parameters,
      block,
    };
  }
  statement(ctx: StatementCstChildren) {
    if (ctx.blockStatement) return this.visit(ctx.blockStatement);
    if (ctx.ifStatement) return this.visit(ctx.ifStatement);
    if (ctx.doStatement) return this.visit(ctx.doStatement);
    if (ctx.whileStatement) return this.visit(ctx.whileStatement);
    if (ctx.emptyStatement) return this.visit(ctx.emptyStatement);
    if (ctx.variableDeclarationStatement) return this.visit(ctx.variableDeclarationStatement);
    if (ctx.expressionStatement) return this.visit(ctx.expressionStatement);
    throw new Error();
  }
  ifStatement(ctx: any) {
    console.log("ifStatement", ctx);
    return { name: "bla" };
  }
  whileStatement(ctx: any) {
    console.log("whileStatement", ctx);
    return { name: "bla" };
  }
  doStatement(ctx: any) {
    console.log("doStatement", ctx);
    return { name: "bla" };
  }
  blockStatement(ctx: BlockStatementCstChildren) {
    return { _name: "blockStatement", statements: ctx.statement?.map((s) => this.visit(s)) };
  }
  variableDeclarationStatement(ctx: VariableDeclarationStatementCstChildren) {
    const id = ctx.ID[0].image;
    this.currentScope.ids.push(id);

    return { _name: "variableDeclarationStatement", id };
  }
  expressionStatement(ctx: ExpressionStatementCstChildren) {
    return this.visit(ctx.expression);
  }
  expression(ctx: ExpressionCstChildren) {
    if (ctx.assignExpression) return this.visit(ctx.assignExpression);
    if (ctx.functionCallExpression) return this.visit(ctx.functionCallExpression);
    if (ctx.relationExpression) return this.visit(ctx.relationExpression);
    throw new Error();
  }
  relationExpression(ctx: any) {
    console.log("relationExpression", ctx);
    return { name: "bla" };
  }
  AdditionExpression(ctx: any) {
    console.log("AdditionExpression", ctx);
    return { name: "bla" };
  }
  assignExpression(ctx: AssignExpressionCstChildren) {
    const lhs = ctx.ID[0].image;
    if (!this.inScope(lhs)) this.pushError(`id ${lhs} does not exist`, ctx.ID[0]);
    const rhs = this.visit(ctx.expression);
    return { _name: "assignExpression", lhs, rhs };
  }
  functionCallExpression(ctx: any) {
    console.log("functionCallExpression", ctx);
    return { name: "bla" };
  }
  term(ctx: any) {
    console.log("term", ctx);
    return { name: "bla" };
  }
  paren_expr(ctx: any) {
    console.log("paren_expr", ctx);
    return { name: "bla" };
  }
  emptyStatement(ctx: any) {
    console.log("emptyStatement", ctx);
    return { name: "bla" };
  }
  parameterList(ctx: any) {
    console.log("parameterList", ctx);
    return { name: "bla" };
  }
  typeDeclaration(ctx: any) {
    console.log("typeDeclaration", ctx);
    return { name: "bla" };
  }
}

export const cstVisitor = new CstVisitor();
