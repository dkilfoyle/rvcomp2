import { CstNode, CstNodeLocation, IToken } from "chevrotain";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import { DocComment } from "./CommentParser";
import parser from "./parser";
import {
  AdditionExpressionCstChildren,
  AtomicExpressionCstChildren,
  BlockStatementCstChildren,
  BoolLiteralExpressionCstChildren,
  ExpressionListCstChildren,
  ExpressionStatementCstChildren,
  FunctionCallExpressionCstChildren,
  FunctionDeclarationCstChildren,
  IdentifierExpressionCstChildren,
  IntegerLiteralExpressionCstChildren,
  LiteralExpressionCstChildren,
  MultiplicationExpressionCstChildren,
  ParenExpressionCstChildren,
  ProgramCstChildren,
  StatementCstChildren,
  StringLiteralExpressionCstChildren,
  TypeSpecifierCstChildren,
  UnaryExpressionCstChildren,
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

// interface IDeclaration {
//   name: string;
//   type: string;
//   pos: IPos;
//   docComment?: DocComment;
// }

// export interface IVariableDeclaration extends IDeclaration {
//   kind: "variable";
// }

// export interface IFunctionDeclaration extends IDeclaration {
//   kind: "function";
//   params: IVariableDeclaration[];
// }

// type ISignature = IVariableDeclaration | IFunctionDeclaration;

type IDeclarationType = "int" | "string" | "bool" | "void";
type IDeclarationValue = number | string | boolean | undefined;

export class Signature {
  public name: string;
  public type: IDeclarationType;
  public pos: IPos;
  public value: IDeclarationValue;
  constructor(name: string, type: IDeclarationType, pos: IPos, value?: IDeclarationValue) {
    this.name = name;
    this.type = type;
    this.pos = pos;
    this.value = value;
  }
  toString() {
    return "base Signature";
  }
  toSuggestionString() {
    return "base suggestion";
  }
}

export class VariableSignature extends Signature {
  toString() {
    return `${this.type} ${this.name}`;
  }
  toSuggestionString() {
    return this.toString() + "var";
  }
}

export class FunctionSignature extends Signature {
  public params: VariableSignature[];
  public docComment?: DocComment;
  constructor(name: string, type: IDeclarationType, params: VariableSignature[], pos: IPos, docComment?: DocComment) {
    super(name, type, pos);
    this.params = params;
    this.docComment = docComment;
  }
  toString() {
    return `${this.type} ${this.name} (${this.params.map((p) => p.toString()).join(", ")})`;
  }
  toSuggestionString() {
    return this.toString() + (this.docComment ? "\n\n" + this.docComment?.toSuggestionString() : "");
  }
}

export interface IScope {
  name: string;
  signatures: Signature[];
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
        new FunctionSignature(
          "print_int",
          "void",
          [new VariableSignature("x", "int", getLibPos())],
          getLibPos(),
          new DocComment("/**\n* @desc Print an integer to console\n* @param [int num] Number to print\n*/")
        ),
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

  // addToScope(name: string, type: string, pos: IPos, params?: IVariableDeclaration[], docComment?: DocComment) {
  //   this.currentScope.signatures.push({ name, type, pos, docComment, params: params ? params : [], kind: params ? "function" : "variable" });
  // }

  addToScope(signature: Signature) {
    this.currentScope.signatures.push(signature);
  }

  getSignature(testid: string, scope = this.currentScope): Signature | undefined {
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

  isInScope(testid: string, scope = this.currentScope): Signature | undefined {
    return this.getSignature(testid, scope);
  }

  flattenDown(scope = this.stack): Signature[] {
    const sigs: Signature[] = [];
    const getScopeSymbols = (scope: IScope) => {
      scope.signatures.forEach((sig) => {
        sigs.push(sig);
      });
      scope.children.forEach((child) => getScopeSymbols(child));
    };
    getScopeSymbols(scope);
    return sigs;
  }

  flattenUp(scope = this.stack): Signature[] {
    const sigs: Signature[] = [];
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

// interface IAstNode {
//   name: string;
// }

// type IAstOperator = "+" | "-" | "*" | "/";

// interface IAstExpression extends IAstNode {
//   lhs: IAstExpression | IAstAtomic;
//   rhs: IAstExpression | IAstAtomic;
//   op: IAstOperator;
// }

// interface IAstAtomic {

// }

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

  checkParams(fnid: string, pos: IPos, params: VariableSignature[]) {
    const fn = this.scopeStack.getSignature(fnid) as FunctionSignature;
    if (fn && fn.params.length != params.length) this.pushError(`Expecting ${fn.params.length} parameters`, pos);
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
    const docComment = ctx.DocComment ? new DocComment(ctx.DocComment[0].image) : undefined;
    const decl: VariableSignature = this.visit(ctx.variableDeclaration);
    const params: VariableSignature[] = ctx.params ? this.visit(ctx.params).declarations : [];

    console.log(docComment);

    this.scopeStack.addToScope(new FunctionSignature(decl.name, decl.type, params, decl.pos, docComment));

    this.scopeStack.pushScope(decl.name, ctx.blockStatement[0].location);
    params.forEach((p) => this.scopeStack.addToScope(p));

    const block = this.visit(ctx.blockStatement);

    this.scopeStack.popScope();

    return {
      _name: "functionDeclaration",
      id: decl.name,
      params,
      block,
      docComment,
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
    this.scopeStack.addToScope(new VariableSignature(decl.name, decl.type, decl.pos));
    return decl;
  }

  expressionStatement(ctx: ExpressionStatementCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  assignStatement(ctx: any) {
    const lhs = this.visit(ctx.identifierExpression);
    const rhs = this.visit(ctx.additionExpression);
    console.log(lhs, rhs);
    if (lhs.type !== rhs.type) this.errors.push({ ...rhs.pos, code: "2", message: "type mismatch (assign)" });
    return { _name: "assignExpression", lhs, rhs };
  }

  // expressions

  additionExpression(ctx: AdditionExpressionCstChildren) {
    const lhs = this.visit(ctx.multiplicationExpression[0]);
    const rhs = this.visit(ctx.multiplicationExpression[1]);
    if (!rhs && lhs.type === "void") return lhs;

    if (lhs.type !== "int") {
      console.log("AdditionExpression LHS", lhs);
      this.errors.push({ ...lhs.pos, code: "2", message: "The LHS of arthrimetic operation must be of type int" });
      return { _name: "invalidOperation", type: "int" };
    }
    if (!rhs) return lhs;

    if (rhs.type !== "int") {
      console.log("AdditionExpression RHS", rhs);
      this.errors.push({ ...rhs.pos, code: "2", message: "The RHS of arthrimetic operation must be of type int" });
      return { _name: "invalidOperation", type: "int" };
    }
    return { _name: "additionExpression", lhs, rhs, op: ctx.Minus ? "-" : "+", type: "int" };
  }

  multiplicationExpression(ctx: MultiplicationExpressionCstChildren) {
    const lhs = this.visit(ctx.atomicExpression[0]);
    const rhs = this.visit(ctx.atomicExpression[1]);
    if (!rhs) return lhs;
    if (lhs.type !== rhs.type) this.errors.push({ ...rhs.pos, code: "2", message: "type mismatch (mult expression)" });
    else return { _name: "multiplicationExpression", lhs, rhs, op: ctx.Divide ? "/" : "*" };
  }

  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.identifierExpression) return this.visit(ctx.identifierExpression);
    if (ctx.literalExpression) return this.visit(ctx.literalExpression);
    if (ctx.functionCallExpression) return this.visit(ctx.functionCallExpression);
    if (ctx.parenExpression) return this.visit(ctx.parenExpression);
    if (ctx.unaryExpression) return this.visit(ctx.unaryExpression);
  }

  unaryExpression(ctx: UnaryExpressionCstChildren) {
    const lhs = this.visit(ctx.additionExpression);
    return { name: "unaryExpression", lhs, type: lhs.type };
  }

  functionCallExpression(ctx: FunctionCallExpressionCstChildren) {
    const fndecl: Signature = this.visit(ctx.identifierExpression);
    const params = ctx.expressionList ? this.visit(ctx.expressionList).params : [];
    this.checkParams(fndecl.name, fndecl.pos, params);
    return { _name: "functionCallExpression", id: fndecl.name, params: params.params, type: fndecl.type };
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren) {
    const id = ctx.ID[0].image;
    const decl = this.checkInScope(id, this.getTokenPos(ctx.ID[0]));
    return { _name: "identifierExpression", ...decl, pos: this.getTokenPos(ctx.ID[0]) };
  }

  literalExpression(ctx: LiteralExpressionCstChildren) {
    if (ctx.integerLiteralExpression) return this.visit(ctx.integerLiteralExpression);
    else if (ctx.stringLiteralExpression) return this.visit(ctx.stringLiteralExpression);
    else if (ctx.boolLiteralExpression) return this.visit(ctx.boolLiteralExpression);
    else {
      throw new Error();
    }
  }

  integerLiteralExpression(ctx: IntegerLiteralExpressionCstChildren) {
    const value: number = parseInt(ctx.IntegerLiteral[0].image);
    return { _name: "integerLiteralExpression", value, type: "int", pos: this.getTokenPos(ctx.IntegerLiteral[0]) };
  }

  stringLiteralExpression(ctx: StringLiteralExpressionCstChildren) {
    let value: string = ctx.StringLiteral[0].image.substring(1);
    value = value.substring(0, value.length - 1);
    return { _name: "stringLiteralExpression", value, type: "string", pos: this.getTokenPos(ctx.StringLiteral[0]) };
  }

  boolLiteralExpression(ctx: BoolLiteralExpressionCstChildren) {
    const token = ctx.True || ctx.False;
    const value: boolean = ctx.True !== undefined;
    return { _name: "boolLiteralExpression", value, type: "bool", pos: this.getTokenPos(token![0]) };
  }

  parenExpression(ctx: ParenExpressionCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  expressionList(ctx: ExpressionListCstChildren) {
    return { _name: "expressionList", params: ctx.additionExpression.map((e) => this.visit(e)) };
  }

  typeSpecifier(ctx: TypeSpecifierCstChildren) {
    let t;
    if (ctx.Int) t = "int";
    else if (ctx.Void) t = "void";
    else if (ctx.Bool) t = "bool";
    else if (ctx.String) t = "string";
    else throw new Error();

    return { _name: "typeSpecifier", type: t };
  }

  variableDeclaration(ctx: VariableDeclarationCstChildren) {
    const name = ctx.ID[0].image;
    const pos = this.getTokenPos(ctx.ID[0]);
    const type = this.visit(ctx.typeSpecifier).type;
    let value = ctx.literalExpression ? this.visit(ctx.literalExpression) : undefined;
    if (value && value.type !== type) this.errors.push({ ...pos, code: "2", message: "type mismatch (var decl)" });
    return { _name: "variableDeclaration", name, pos, type, value };
  }
}

export const cstVisitor = new CstVisitor();
