import { CstNode, CstNodeLocation, IToken } from "chevrotain";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import parser from "./parser";
import {
  AdditionExpressionCstChildren,
  AtomicExpressionCstChildren,
  BlockStatementCstChildren,
  ExpressionListCstChildren,
  ExpressionStatementCstChildren,
  FunctionCallExpressionCstChildren,
  FunctionDeclarationCstChildren,
  IdentifierExpressionCstChildren,
  IntegerLiteralExpressionCstChildren,
  MultiplicationExpressionCstChildren,
  ParenExpressionCstChildren,
  ProgramCstChildren,
  StatementCstChildren,
  TypeSpecifierCstChildren,
  VariableDeclarationCstChildren,
  VariableDeclarationListCstChildren,
  VariableDeclarationStatementCstChildren,
} from "./simpleC";

const CstBaseVisitor = parser.parserInstance.getBaseCstVisitorConstructor();

interface IPos {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface IDeclaration {
  name: string;
  type: string;
  pos: IPos;
}

export interface IVariableDeclaration extends IDeclaration {
  kind: "variable";
}

export interface IFunctionDeclaration extends IDeclaration {
  kind: "function";
  params: IVariableDeclaration[];
}

type ISignature = IVariableDeclaration | IFunctionDeclaration;

export interface IScope {
  name: string;
  signatures: ISignature[];
  location: CstNodeLocation;
  parent: IScope | undefined;
  children: IScope[];
}

class ScopeStack {
  public stack!: IScope;
  public currentScope!: IScope;

  constructor() {
    // this.stack = this.getGlobalScope();
    // this.currentScope = this.stack;
  }

  reset(location: CstNodeLocation) {
    this.stack = this.getGlobalScope(location);
    this.currentScope = this.stack;
  }

  getGlobalScope(location: CstNodeLocation): IScope {
    const getLibPos = () => ({ startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 });
    return {
      name: "global",
      location,
      parent: undefined,
      children: [],
      signatures: [
        {
          kind: "function",
          name: "print_int",
          type: "void",
          pos: getLibPos(),
          params: [{ kind: "variable", name: "num", type: "int", pos: getLibPos() }],
        },
      ],
    };
  }

  pushScope(name: string, location: CstNodeLocation | undefined) {
    if (!location) throw new Error("Need node location");
    const newScope: IScope = { name, location, parent: this.currentScope, signatures: [], children: [] };
    if (this.currentScope) this.currentScope.children.push(newScope);
    this.currentScope = newScope;
  }

  popScope() {
    if (this.currentScope.parent) this.currentScope = this.currentScope.parent;
  }

  addToScope(name: string, type: string, pos: IPos, params?: IVariableDeclaration[]) {
    this.currentScope.signatures.push({ name, type, pos, params: params ? params : [], kind: params ? "function" : "variable" });
  }

  getSignature(testid: string, scope = this.currentScope): ISignature | undefined {
    const found = scope.signatures.find((sig) => sig.name == testid);
    if (found) return found;
    if (scope.parent) return this.getSignature(testid, scope.parent);
    else return undefined;
  }

  isPosInScopeRange(offset: number, scope: IScope) {
    let x: number;
    return offset >= scope.location.startOffset && scope.location.endOffset && offset < scope.location.endOffset;
  }

  getScopeAtLocation(offset: number, scope: IScope = this.stack): IScope | null {
    if (scope.children.length == 0) return scope;

    for (let i = 0; i < scope.children.length; i++) {
      let child = this.getScopeAtLocation(offset, scope.children[i]);
      if (child) return child;
    }

    return null;
  }

  getSignatureAtLocation(testid: string, offset: number, scope = this.currentScope) {
    if (!this.isPosInScopeRange(offset, scope)) return null;

    // if leaf scope then look for id
    if (scope.children.length === 0) return this.getSignature(testid, scope);

    // scopes do not overlap so only one of the children will contain pos
    let signature;
    scope.children.find((childScope) => {
      signature = this.getSignatureAtLocation(testid, offset, childScope);
      return signature;
    });

    // this scope doesn't have testid
    return signature;
  }

  isInScope(testid: string, scope = this.currentScope): ISignature | undefined {
    return this.getSignature(testid, scope);
  }

  flattenDown(scope = this.stack): ISignature[] {
    const sigs: ISignature[] = [];
    const getScopeSymbols = (scope: IScope) => {
      scope.signatures.forEach((sig) => {
        sigs.push(sig);
      });
      scope.children.forEach((child) => getScopeSymbols(child));
    };
    getScopeSymbols(scope);
    return sigs;
  }

  flattenUp(scope = this.stack): ISignature[] {
    const sigs: ISignature[] = [];
    const getScopeSymbols = (scope: IScope) => {
      scope.signatures.forEach((sig) => {
        sigs.push(sig);
      });
      if (scope.parent) getScopeSymbols(scope.parent);
    };
    getScopeSymbols(scope);
    return sigs;
  }
}

// program:
//   functionDeclaration*
//   | statement*
// functionDeclaration:
//   typedIdentifier
//   '(' parameterList? ')'
//    block
// parameterList:
//   typedIdentifier (',' typedIdentifier)*
// typedIdtentifier: typeSpecifier ID
// typeSpecifier: (IntType | VoidType)
// variableDeclarationStatement
//   typedIdentifier ';'

class CstVisitor extends CstBaseVisitor {
  public errors: ISimpleCLangError[];
  public scopeStack: ScopeStack;

  constructor() {
    super();
    this.validateVisitor();
    this.scopeStack = new ScopeStack();
    this.errors = [];
  }

  reset(location: CstNodeLocation) {
    this.errors = [];
    this.scopeStack.reset(location);
  }

  getTokenPos(token: IToken) {
    return {
      startLineNumber: token.startLine || 0,
      startColumn: token.startColumn || 0,
      endLineNumber: token.endLine || 0,
      endColumn: (token.endColumn || 0) + 1,
    };
  }

  checkInScope(testid: string, pos: IPos, scope = this.scopeStack.currentScope) {
    const sig = this.scopeStack.getSignature(testid, scope);
    if (!sig) this.pushError(`Cannot find name'${testid}'`, pos);
    return sig;
  }

  checkParams(fnid: string, pos: IPos, params: IVariableDeclaration[]) {
    const fn = this.scopeStack.getSignature(fnid);
    if (fn && fn.kind === "function") {
      if (fn.params.length != params.length) this.pushError(`Expecting ${fn.params.length} parameters`, pos);
    } else debugger;
  }

  pushError(message: string, pos: IPos) {
    this.errors.push({
      ...pos,
      code: "Linter",
      message,
    });
  }

  go(rootNode: CstNode) {
    if (!rootNode.location) throw new Error("Need node location");
    this.reset(rootNode.location);
    return this.program(rootNode.children);
  }

  program(ctx: ProgramCstChildren) {
    const functionDeclarations = ctx.functionDeclaration?.map((node) => this.visit(node)) || [];
    const rootLevelStatements = ctx.statement?.map((node) => this.visit(node)) || [];
    return { _name: "program", functionDeclarations, rootLevelStatements, scopeStack: this.scopeStack, errors: this.errors };
  }

  functionDeclaration(ctx: FunctionDeclarationCstChildren) {
    const decl: IVariableDeclaration = this.visit(ctx.variableDeclaration);
    const params: IVariableDeclaration[] = ctx.params ? this.visit(ctx.params).declarations : [];

    this.scopeStack.addToScope(decl.name, decl.type, decl.pos, params);

    this.scopeStack.pushScope(decl.name, ctx.blockStatement[0].location);
    params.forEach((p) => this.scopeStack.addToScope(p.name, p.type, p.pos));

    const block = this.visit(ctx.blockStatement);

    this.scopeStack.popScope();

    return {
      _name: "functionDeclaration",
      id: decl.name,
      params,
      block,
    };
  }

  variableDeclarationList(ctx: VariableDeclarationListCstChildren) {
    return { _name: "variableDeclarationList", declarations: ctx.variableDeclaration.map((p) => this.visit(p)) };
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
    return { name: "unimplented_if" };
  }

  whileStatement(ctx: any) {
    return { name: "unimplemented_while" };
  }

  doStatement(ctx: any) {
    return { name: "unimplented_do" };
  }

  blockStatement(ctx: BlockStatementCstChildren) {
    return { _name: "blockStatement", statements: ctx.statement?.map((s) => this.visit(s)) };
  }

  variableDeclarationStatement(ctx: VariableDeclarationStatementCstChildren) {
    const decl = this.visit(ctx.variableDeclaration);
    this.scopeStack.addToScope(decl.name, decl.type, decl.pos);
    return decl;
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
    const fndecl = this.visit(ctx.identifierExpression);
    const params = ctx.expressionList ? this.visit(ctx.expressionList).params : [];
    this.checkParams(fndecl.name, fndecl.pos, params);
    return { _name: "functionCallExpression", id: fndecl.name, params: params.params };
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren) {
    const id = ctx.ID[0].image;
    const decl = this.checkInScope(id, this.getTokenPos(ctx.ID[0]));
    return { _name: "identifierExpression", ...decl, pos: this.getTokenPos(ctx.ID[0]) };
  }

  integerLiteralExpression(ctx: IntegerLiteralExpressionCstChildren) {
    const value = parseInt(ctx.INT[0].image);
    return { _name: "integerLiteralExpression", value };
  }

  parenExpression(ctx: ParenExpressionCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  expressionList(ctx: ExpressionListCstChildren) {
    return { _name: "expressionList", params: ctx.additionExpression.map((e) => this.visit(e)) };
  }

  typeSpecifier(ctx: TypeSpecifierCstChildren) {
    let t;
    if (ctx.intType) t = ctx.intType[0].image;
    else if (ctx.voidType) t = ctx.voidType[0].image;
    else throw new Error();

    return { _name: "typeSpecifier", type: t };
  }

  variableDeclaration(ctx: VariableDeclarationCstChildren) {
    const name = ctx.ID[0].image;
    const pos = this.getTokenPos(ctx.ID[0]);
    const type = this.visit(ctx.typeSpecifier).type;
    return { _name: "variableDeclaration", name, pos, type };
  }
}

export const cstVisitor = new CstVisitor();
