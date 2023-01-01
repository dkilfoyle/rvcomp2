import { CstNode, CstNodeLocation, IToken } from "chevrotain";
import _ from "lodash";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import parser from "./parser";
import {
  AdditionExpressionCstChildren,
  AtomicExpressionCstChildren,
  BlockStatementCstChildren,
  BoolLiteralExpressionCstChildren,
  ComparisonExpressionCstChildren,
  ExpressionListCstChildren,
  ExpressionStatementCstChildren,
  ForStatementCstChildren,
  FunctionCallExpressionCstChildren,
  FunctionDeclarationCstChildren,
  IdentifierExpressionCstChildren,
  IfStatementCstChildren,
  IntegerLiteralExpressionCstChildren,
  LiteralExpressionCstChildren,
  MultiplicationExpressionCstChildren,
  ParenExpressionCstChildren,
  ProgramCstChildren,
  ReturnStatementCstChildren,
  StatementCstChildren,
  StringLiteralExpressionCstChildren,
  TypeSpecifierCstChildren,
  UnaryExpressionCstChildren,
  VariableDeclarationCstChildren,
  VariableDeclarationListCstChildren,
  VariableDeclarationStatementCstChildren,
  WhileStatementCstChildren,
} from "./simpleC";
import {
  IAstAssignStatement,
  IAstAtomicExpression,
  IAstComparisonExpression,
  IAstComparisonOperator,
  IAstDeclaration,
  IAstExpression,
  IAstForStatement,
  IAstFunctionCallExpression,
  IAstFunctionDeclaration,
  IAstIdentifierExpression,
  IAstIfStatement,
  IAstInvalidExpression,
  IAstNode,
  IAstProgram,
  IAstResult,
  IAstReturnStatement,
  IAstVariableDeclaration,
  IPos,
  parseDocCommentString,
} from "./ast";
import { ISignature, ScopeStack } from "./ScopeStack";

export const convertCstNodeLocationToIPos = (pos?: CstNodeLocation) => {
  return {
    startLineNumber: pos?.startLine || 0,
    endLineNumber: pos?.endLine || 0,
    startColumn: pos?.startColumn || 0,
    endColumn: pos?.endColumn || 0,
  };
};

const CstBaseVisitor = parser.parserInstance.getBaseCstVisitorConstructor();

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

  checkParams(fnid: string, pos: IPos, params: IAstVariableDeclaration[]) {
    const fn = this.scopeStack.getSignature(fnid) as IAstFunctionDeclaration;
    if (!fn) return this.pushError(`Function ${fnid} is not defined`, pos);
    if (fn.params.length != params.length) return this.pushError(`Expecting ${fn.params.length} parameters`, pos);
    return true;
  }

  checkInBounds(decl: IAstVariableDeclaration, index: number, pos: IPos) {
    if (_.isUndefined(decl.size)) return true;
    if (index < 0) {
      this.pushError(`Invalid array index: ${index}`, pos);
      return false;
    } else if (index > decl.size - 1) {
      this.pushError(`Array index out of bounds: ${index} > ${decl.size - 1}`, pos);
      return false;
    }
    return true;
  }

  checkTypesMatch(lhs: any, rhs: any) {
    let lhsType: string = lhs.type;
    if (lhs.size && _.isUndefined(lhs.index)) lhsType = `${lhsType}[${lhs.size}]`;
    let rhsType: string = rhs.type;
    if (rhs.size && _.isUndefined(rhs.index)) rhsType = `${rhsType}[${rhs.size}]`;

    if (lhsType !== rhsType) {
      this.errors.push({ ...rhs.pos, code: "2", message: `Type mismatch: ${lhsType} != ${rhsType}` });
      return false;
    } else return true;
  }

  pushError(message: string, pos: IPos) {
    this.errors.push({
      ...pos,
      code: "Linter",
      message,
    });
    return false;
  }

  go(rootNode: CstNode): IAstResult {
    if (!rootNode.location) throw new Error("Need node location");
    this.reset(rootNode.location);
    return { ast: this.program(rootNode.children), scopeStack: this.scopeStack, errors: this.errors };
  }

  program(ctx: ProgramCstChildren): IAstProgram {
    const functionDeclarations =
      ctx.functionDeclaration?.map((node) => ({
        ...this.visit(node),
        pos: node.location ? convertCstNodeLocationToIPos(node.location) : {},
      })) || [];
    const main = functionDeclarations.find((decl) => decl.id === "main");
    if (!main) this.pushError("Missing main function", _.last(functionDeclarations).pos);
    const pos = main ? main.pos : {};
    return { _name: "program", functionDeclarations, pos: convertCstNodeLocationToIPos(pos) };
  }

  functionDeclaration(ctx: FunctionDeclarationCstChildren): IAstFunctionDeclaration {
    const docComment = ctx.DocComment ? parseDocCommentString(ctx.DocComment[0].image) : undefined;
    const iddecl: IAstVariableDeclaration = this.visit(ctx.variableDeclaration);
    const params: IAstVariableDeclaration[] = ctx.params ? this.visit(ctx.params).declarations : [];

    // add function signature to current scope
    const fundecl: IAstFunctionDeclaration = {
      ...iddecl,
      _name: "functionDeclaration",
      params,
      docComment,
    };
    this.scopeStack.addToScope(fundecl);

    // create a scope for function
    // push each param to the function level scope
    this.scopeStack.pushScope(iddecl.id, ctx.blockStatement[0].location);
    params.forEach((p) => this.scopeStack.addToScope(p));

    const block = this.visit(ctx.blockStatement);
    this.scopeStack.popScope();
    fundecl.block = block;
    return fundecl;
  }

  variableDeclarationList(ctx: VariableDeclarationListCstChildren) {
    return { _name: "variableDeclarationList", declarations: ctx.variableDeclaration.map((p) => this.visit(p)) };
  }

  // ==========================================================================================================
  // Statements
  // ==========================================================================================================

  statement(ctx: StatementCstChildren) {
    if (ctx.blockStatement) {
      this.scopeStack.pushScope("block", ctx.blockStatement[0].location);
      const block = this.visit(ctx.blockStatement);
      this.scopeStack.popScope();
      return { ...block };
    }
    if (ctx.ifStatement) return this.visit(ctx.ifStatement);
    if (ctx.forStatement) return this.visit(ctx.forStatement);
    if (ctx.whileStatement) return this.visit(ctx.whileStatement);
    if (ctx.variableDeclarationStatement) return this.visit(ctx.variableDeclarationStatement);
    if (ctx.expressionStatement) return this.visit(ctx.expressionStatement);
    if (ctx.assignStatement) return this.visit(ctx.assignStatement);
    if (ctx.returnStatement) return this.visit(ctx.returnStatement);
    throw new Error();
  }

  ifStatement(ctx: IfStatementCstChildren): IAstIfStatement {
    return {
      _name: "ifStatement",
      cond: this.visit(ctx.comparisonExpression),
      then: this.visit(ctx.statement[0]),
      else: ctx.statement.length == 2 ? this.visit(ctx.statement[1]) : undefined,
    };
  }

  forStatement(ctx: ForStatementCstChildren): IAstForStatement {
    return {
      _name: "forStatement",
      init: this.visit(ctx.initStatement),
      test: this.visit(ctx.test),
      step: this.visit(ctx.stepStatement),
      loop: this.visit(ctx.loopStatement),
    };
  }

  whileStatement(ctx: WhileStatementCstChildren) {
    return {
      _name: "whileStatement",
      test: this.visit(ctx.comparisonExpression),
      loop: this.visit(ctx.statement),
    };
  }

  doStatement(ctx: any) {
    return { _name: "unimplented_do" };
  }

  returnStatement(ctx: ReturnStatementCstChildren): IAstReturnStatement {
    const lhs = ctx.additionExpression ? this.visit(ctx.additionExpression) : undefined;
    return { _name: "returnStatement", lhs };
  }

  blockStatement(ctx: BlockStatementCstChildren) {
    const statements = ctx.statement?.map((s) => this.visit(s));
    const heapVars = this.scopeStack.getArrays();
    return { _name: "blockStatement", statements, heapVars };
  }

  variableDeclarationStatement(ctx: VariableDeclarationStatementCstChildren) {
    const decl = this.visit(ctx.variableDeclaration);
    this.scopeStack.addToScope(decl);
    return decl;
  }

  expressionStatement(ctx: ExpressionStatementCstChildren) {
    return this.visit(ctx.additionExpression);
  }

  assignStatement(ctx: any): IAstAssignStatement {
    const lhs = this.visit(ctx.identifierExpression);
    const rhs = this.visit(ctx.additionExpression);
    this.checkTypesMatch(lhs, rhs);

    return { _name: "assignStatement", lhs, rhs };
  }

  // ==========================================================================================================
  // Expressions
  // ==========================================================================================================

  comparisonExpression(ctx: ComparisonExpressionCstChildren): IAstComparisonExpression {
    const lhs = this.visit(ctx.lhs);

    if (ctx.rhs && ctx.ComparisonOperator) {
      const rhs = this.visit(ctx.rhs);
      let op: IAstComparisonOperator;
      switch (ctx.ComparisonOperator[0].image) {
        case ">":
          op = "gt";
          break;
        case ">=":
          op = "ge";
          break;
        case "<":
          op = "lt";
          break;
        case "<=":
          op = "le";
          break;
        case "==":
          op = "eq";
          break;
        default:
          op = "gt";
      }
      return { _name: "comparisonExpression", lhs, rhs, op, type: "bool" };
    } else {
      if ((lhs as IAstExpression)._name != "identifierExpression") {
        const pos = convertCstNodeLocationToIPos(ctx.lhs[0].location);
        this.errors.push({ ...pos, code: "2", message: "expect identifier or comparison" });
      }
      if ((lhs as IAstExpression).type !== "bool") {
        const pos = convertCstNodeLocationToIPos(ctx.lhs[0].location);
        this.errors.push({ ...pos, code: "2", message: "expect identifier type is bool" });
      }
      return { _name: "comparisonExpression", lhs, op: "eq", type: "bool" };
    }
  }

  getOperator(op: string) {
    switch (op) {
      case "+":
        return "add";
      case "-":
        return "sub";
      case "*":
        return "mul";
      case "/":
        return "div";
    }
  }

  binaryExpression(ctx: AdditionExpressionCstChildren | MultiplicationExpressionCstChildren) {
    const typeError = (node: any): IAstInvalidExpression => {
      this.errors.push({ ...node.pos, code: "2", message: "Arthrimetic operand must be of type int" });
      return { _name: "invalidExpression", type: "int" };
    };

    let lhs = this.visit(ctx.operands[0]);
    // if (lhs.type !== "int") return typeError(lhs);

    for (let i = 1; i < ctx.operands.length; i++) {
      const rhs = this.visit(ctx.operands[i]);
      if (rhs.type !== "int") return typeError(rhs);

      lhs = {
        _name: "binaryExpression",
        lhs: { ...lhs },
        rhs,
        op: ctx.operators ? this.getOperator(ctx.operators[i - 1].image) : undefined,
        type: "int",
      };

      // console.log("AdditionExpression LHS", lhs);
    }

    return lhs;
  }

  additionExpression(ctx: AdditionExpressionCstChildren): IAstExpression {
    return this.binaryExpression(ctx);
  }

  multiplicationExpression(ctx: MultiplicationExpressionCstChildren): IAstExpression {
    return this.binaryExpression(ctx);
  }

  atomicExpression(ctx: AtomicExpressionCstChildren): IAstAtomicExpression {
    if (ctx.identifierExpression) return this.visit(ctx.identifierExpression);
    if (ctx.literalExpression) return this.visit(ctx.literalExpression);
    if (ctx.functionCallExpression) return this.visit(ctx.functionCallExpression);
    if (ctx.parenExpression) return this.visit(ctx.parenExpression);
    if (ctx.unaryExpression) return this.visit(ctx.unaryExpression);
    throw Error();
  }

  unaryExpression(ctx: UnaryExpressionCstChildren) {
    const lhs = this.visit(ctx.additionExpression);
    return { name: "unaryExpression", lhs, type: lhs.type };
  }

  functionCallExpression(ctx: FunctionCallExpressionCstChildren): IAstFunctionCallExpression {
    const fndecl: IAstIdentifierExpression = this.visit(ctx.identifierExpression);
    const params = ctx.expressionList ? this.visit(ctx.expressionList).params : [];
    const pass = this.checkParams(fndecl.id, fndecl.pos!, params);
    return { _name: "functionCallExpression", id: fndecl.id, params, type: fndecl.type, pos: fndecl.pos };
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren) {
    const id = ctx.ID[0].image;
    const index = ctx.arrayIndex ? this.visit(ctx.arrayIndex[0]).value : undefined;
    const decl = this.checkInScope(id, this.getTokenPos(ctx.ID[0])) as IAstVariableDeclaration;
    if (decl && !_.isUndefined(index)) {
      this.checkInBounds(decl, index.value, index.pos);
    }
    return { ...decl, _name: "identifierExpression", pos: this.getTokenPos(ctx.ID[0]), index };
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

  variableDeclaration(ctx: VariableDeclarationCstChildren): IAstVariableDeclaration {
    const id = ctx.ID[0].image;
    const pos = this.getTokenPos(ctx.ID[0]);
    let type = this.visit(ctx.typeSpecifier).type;

    const arraySize = ctx.arraySize ? this.visit(ctx.arraySize[0]).value : undefined;

    // TODO: Support any numeric expression for initValue including array
    let initValue = ctx.literalExpression ? this.visit(ctx.literalExpression) : undefined;
    if (initValue && initValue.type !== type) this.errors.push({ ...pos, code: "2", message: "type mismatch (var decl)" });

    return { _name: "variableDeclaration", id, pos, type, initValue, size: arraySize };
  }
}

export const cstVisitor = new CstVisitor();
