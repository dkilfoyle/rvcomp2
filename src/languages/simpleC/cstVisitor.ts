import { IToken } from "chevrotain";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import parser from "./parser";
import {
  AdditionExpressionCstChildren,
  AtomicExpressionCstChildren,
  BlockStatementCstChildren,
  ExpressionStatementCstChildren,
  FunctionCallExpressionCstChildren,
  FunctionDeclarationCstChildren,
  IdentifierExpressionCstChildren,
  IntegerLiteralExpressionCstChildren,
  MultiplicationExpressionCstChildren,
  ParameterListCstChildren,
  ParenExpressionCstChildren,
  ProgramCstChildren,
  StatementCstChildren,
  VariableDeclarationStatementCstChildren,
} from "./simpleC";

const CstBaseVisitor = parser.parserInstance.getBaseCstVisitorConstructor();

interface Pos {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

interface Identifier {
  id: string;
  pos: Pos;
}

interface Scope {
  name: string;
  ids: Identifier[];
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
    this.scopeStack = this.getGlobalScope();
    this.currentScope = this.scopeStack;
  }
  reset() {
    this.errors = [];
    this.scopeStack = this.getGlobalScope();
    this.currentScope = this.scopeStack;
  }
  getGlobalScope() {
    const getLibFnDef = (id: string) => ({ id, pos: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 } });
    return { name: "global", parent: undefined, ids: [getLibFnDef("print_int")], children: [] };
  }

  pushScope(name: string) {
    const newScope = { name, parent: this.currentScope, ids: [], children: [] };
    if (this.currentScope) this.currentScope.children.push(newScope);
    this.currentScope = newScope;
  }
  popScope() {
    if (this.currentScope.parent) this.currentScope = this.currentScope.parent;
  }
  addToScope(id: string, token: IToken) {
    this.currentScope.ids.push({ id, pos: this.getTokenPos(token) });
  }
  getTokenPos(token: IToken) {
    return {
      startLine: token.startLine || 0,
      startColumn: token.startColumn || 0,
      endLine: token.endLine || 0,
      endColumn: token.endColumn || 0,
    };
  }
  isInScope(testid: string, scope = this.currentScope): boolean {
    const found = scope.ids.find((id) => id.id == testid);
    if (found) return true;
    if (scope.parent) return this.isInScope(testid, scope.parent);
    else return false;
  }
  checkInScope(testid: string, token: IToken, scope = this.currentScope) {
    if (!this.isInScope(testid, scope)) this.pushError(`Cannot find name'${testid}'`, token);
  }

  pushError(message: string, token: IToken) {
    this.errors.push({
      startColumn: token.startColumn || 0,
      startLineNumber: token.startLine || 0,
      endColumn: (token.endColumn || 0) + 1,
      endLineNumber: token.endLine || 0,
      code: "Linter",
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
    this.addToScope(id, ctx.ID[0]);
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
    if (ctx.variableDeclarationStatement) return this.visit(ctx.variableDeclarationStatement);
    if (ctx.expressionStatement) return this.visit(ctx.expressionStatement);
    if (ctx.assignStatement) return this.visit(ctx.assignStatement);
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
    this.addToScope(id, ctx.ID[0]);
    return { _name: "variableDeclarationStatement", id };
  }
  expressionStatement(ctx: ExpressionStatementCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  assignStatement(ctx: any) {
    const lhs = this.visit(ctx.identifierExpression);
    const rhs = this.visit(ctx.additionExpression);
    return { _name: "assignExpression", lhs, rhs };
  }

  // expressions

  additionExpression(ctx: AdditionExpressionCstChildren) {
    const lhs = this.visit(ctx.multiplicationExpression[0]);
    const rhs = this.visit(ctx.multiplicationExpression[1]);
    if (!rhs) return lhs;
    return { _name: "additionExpression", lhs, rhs, op: ctx.Minus ? "-" : "+" };
  }

  multiplicationExpression(ctx: MultiplicationExpressionCstChildren) {
    const lhs = this.visit(ctx.atomicExpression[0]);
    const rhs = this.visit(ctx.atomicExpression[1]);
    if (!rhs) return lhs;
    else return { _name: "multiplicationExpression", lhs, rhs, op: ctx.Divide ? "/" : "*" };
  }

  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.identifierExpression) return this.visit(ctx.identifierExpression);
    if (ctx.integerLiteralExpression) return this.visit(ctx.integerLiteralExpression);
    if (ctx.functionCallExpression) return this.visit(ctx.functionCallExpression);
    if (ctx.parenExpression) return this.visit(ctx.parenExpression);
    // return this.visit(ctx.);
  }

  unaryExpression(ctx: any) {
    console.log("unaryExpression", ctx);
    return { name: "bla" };
  }

  functionCallExpression(ctx: FunctionCallExpressionCstChildren) {
    const id = this.visit(ctx.identifierExpression).id;
    const params = this.visit(ctx.parameterList);
    return { _name: "functionCallExpression", id, params: params.params };
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren) {
    const id = ctx.ID[0].image;
    this.checkInScope(id, ctx.ID[0]);
    return { _name: "identifierExpression", id };
  }

  integerLiteralExpression(ctx: IntegerLiteralExpressionCstChildren) {
    const value = parseInt(ctx.INT[0].image);
    return { _name: "integerLiteralExpression", value };
  }

  parenExpression(ctx: ParenExpressionCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  parameterList(ctx: ParameterListCstChildren) {
    return { _name: "parameterList", params: ctx.additionExpression.map((e) => this.visit(e)) };
  }

  typeDeclaration(ctx: any) {
    console.log("typeDeclaration", ctx);
    return { name: "bla" };
  }
}

export const cstVisitor = new CstVisitor();
