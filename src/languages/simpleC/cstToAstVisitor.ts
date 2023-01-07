import { CstNode, CstNodeLocation, IToken } from "chevrotain";
import _ from "lodash";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import parser from "./parser";
import {
  AdditionExpressionCstChildren,
  ArrayLiteralExpressionCstChildren,
  AtomicExpressionCstChildren,
  BlockStatementCstChildren,
  BoolLiteralExpressionCstChildren,
  ComparisonExpressionCstChildren,
  ExpressionListCstChildren,
  FloatLiteralExpressionCstChildren,
  ForStatementCstChildren,
  FunctionCallExpressionCstChildren,
  FunctionCallStatementCstChildren,
  FunctionDeclarationCstChildren,
  IdentifierExpressionCstChildren,
  IfStatementCstChildren,
  IntegerLiteralExpressionCstChildren,
  LiteralExpressionCstChildren,
  MultiplicationExpressionCstChildren,
  ParenExpressionCstChildren,
  ProgramCstChildren,
  ProgramCstNode,
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
  IAstArrayLiteralExpression,
  IAstAssignStatement,
  IAstAtomicExpression,
  IAstBoolLiteralExpression,
  IAstExpression,
  IAstForStatement,
  IAstFunctionDeclaration,
  IAstIdentifierExpression,
  IAstIfStatement,
  IAstIntArthimeticOperator,
  IAstInvalidExpression,
  IAstLiteralExpression,
  IAstProgram,
  IAstResult,
  IAstReturnStatement,
  IAstVariableDeclaration,
  IPos,
  parseDocCommentString,
} from "./ast";
import { ScopeStack } from "./ScopeStack";
import { BreadcrumbLink } from "@chakra-ui/react";
import { removeHandlers } from "rc-dock";

export const convertCstNodeLocationToIPos = (pos?: CstNodeLocation) => {
  return {
    startLineNumber: pos?.startLine || 0,
    endLineNumber: pos?.endLine || 0,
    startColumn: pos?.startColumn || 0,
    endColumn: pos?.endColumn || 0,
  };
};

const operatorLookup = {
  "+": { op: "add", type: "num" },
  "-": { op: "sub", type: "num" },
  "*": { op: "mul", type: "num" },
  "/": { op: "div", type: "num" },
  ">": { op: "gt", type: "bool" },
  "<": { op: "lt", type: "bool" },
  ">=": { op: "ge", type: "bool" },
  "<=": { op: "le", type: "bool" },
  "==": { op: "eq", type: "bool" },
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

  getExpressionType(lhs: IAstExpression) {
    if (lhs._name == "arrayLiteralExpression") {
      const expr = lhs as IAstArrayLiteralExpression;
      return `${expr.type}[${expr.size}]`;
    } else if (lhs._name == "identifierExpression") {
      const expr = lhs as IAstIdentifierExpression;
      if (expr.size && _.isUndefined(expr.index)) return `${expr.type}[${expr.size}]`;
      else return expr.type;
    } else return lhs.type;
  }

  checkTypesMatch(lhs: IAstExpression | string, rhs: IAstExpression) {
    let lhsType: string;
    if (typeof lhs === "string") lhsType = lhs;
    else lhsType = this.getExpressionType(lhs);
    const rhsType = this.getExpressionType(rhs);

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
    return { ast: this.program((rootNode as ProgramCstNode).children), scopeStack: this.scopeStack, errors: this.errors };
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
    if (ctx.functionCallStatement) return this.visit(ctx.functionCallStatement);
    if (ctx.assignStatement) return this.visit(ctx.assignStatement);
    if (ctx.returnStatement) return this.visit(ctx.returnStatement);
    throw new Error();
  }

  ifStatement(ctx: IfStatementCstChildren): IAstIfStatement {
    const cond = this.visit(ctx.testExpression) as IAstExpression;
    if (cond.type != "bool") this.pushError("Expecting bool expression", convertCstNodeLocationToIPos(ctx.testExpression[0].location));
    return {
      _name: "ifStatement",
      cond: this.visit(ctx.testExpression),
      then: this.visit(ctx.thenStatement),
      else: ctx.elseStatement ? this.visit(ctx.elseStatement) : undefined,
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
    const statements = ctx.statement?.map((s) => this.visit(s)) || [];
    const heapVars = this.scopeStack.getArrays();
    return { _name: "blockStatement", statements, heapVars };
  }

  variableDeclarationStatement(ctx: VariableDeclarationStatementCstChildren) {
    const decl = this.visit(ctx.variableDeclaration);
    this.scopeStack.addToScope(decl);
    return decl;
  }

  // expressionStatement(ctx: ExpressionStatementCstChildren) {
  //   return this.visit(ctx.additionExpression);
  // }

  functionCallStatement(ctx: FunctionCallStatementCstChildren) {
    return this.visit(ctx.functionCallExpression);
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

  getOperator(op: string, type: string) {
    let res: string;
    switch (op) {
      case "+":
        res = "add";
        break;
      case "-":
        res = "sub";
        break;
      case "*":
        res = "mul";
        break;
      case "/":
        res = "div";
        break;
      case ">":
        res = "gt";
        break;
      case ">=":
        res = "ge";
        break;
      case "<":
        res = "lt";
        break;
      case "<=":
        res = "le";
        break;
      case "==":
        res = "eq";
        break;
      default:
        throw new Error();
    }
    return type == "int" ? res : "f" + res;
  }

  getOperationType(op: string, type: string) {
    switch (op) {
      case "+":
        return type;
      case "-":
        return type;
      case "*":
        return type;
      case "/":
        return type;
      case ">":
        return "bool";
      case ">=":
        return "bool";
      case "<":
        return "bool";
      case "<=":
        return "bool";
      case "==":
        return "bool";
      default:
        throw new Error("Unknown operation");
    }
  }

  binaryExpression(ctx: AdditionExpressionCstChildren | MultiplicationExpressionCstChildren | ComparisonExpressionCstChildren) {
    const typeError = (node: IAstExpression): IAstInvalidExpression => {
      this.errors.push({ ...node.pos, code: "2", message: "Expression operands must be all of same type" });
      return { _name: "invalidExpression", type: "int", pos: node.pos };
    };

    let lhs = this.visit(ctx.operands[0]);
    // if (lhs.type !== "int") return typeError(lhs);

    for (let i = 1; i < ctx.operands.length; i++) {
      const rhs = this.visit(ctx.operands[i]);

      if (rhs.type !== lhs.type) return typeError(rhs);
      if (ctx.operators && lhs.type != this.getOperationType(ctx.operators[i - 1].image, lhs.type)) {
        this.pushError("Expression operator type does not match operand type", this.getTokenPos(ctx.operators[i - 1]));
        return { _name: "invalidExpression", type: "int", pos: this.getTokenPos(ctx.operators[i - 1]) };
      }

      lhs = {
        _name: lhs.type == "int" ? "intBinaryExpression" : "floatBinaryExpression",
        lhs: { ...lhs },
        rhs,
        op: ctx.operators ? this.getOperator(ctx.operators[i - 1].image, lhs.type) : undefined,
        type: ctx.operators ? this.getOperationType(ctx.operators[i - 1].image, lhs.type) : lhs.type,
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

  comparisonExpression(ctx: ComparisonExpressionCstChildren): IAstExpression {
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

  functionCallExpression(ctx: FunctionCallExpressionCstChildren) {
    const id = ctx.ID[0].image;
    const decl = this.checkInScope(id, this.getTokenPos(ctx.ID[0])) as IAstVariableDeclaration;
    if (!decl) {
      this.pushError(`Function ${id} not defined`, this.getTokenPos(ctx.ID[0]));
      return { _name: "nop" };
    }

    const params = ctx.expressionList ? this.visit(ctx.expressionList).params : [];
    const pass = this.checkParams(decl.id, decl.pos!, params);
    return { _name: "functionCallExpression", id: decl.id, params, type: decl.type, pos: decl.pos };
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

  literalExpression(ctx: LiteralExpressionCstChildren): IAstLiteralExpression {
    if (ctx.integerLiteralExpression) return this.visit(ctx.integerLiteralExpression);
    else if (ctx.floatLiteralExpression) return this.visit(ctx.floatLiteralExpression);
    else if (ctx.stringLiteralExpression) return this.visit(ctx.stringLiteralExpression);
    else if (ctx.boolLiteralExpression) return this.visit(ctx.boolLiteralExpression);
    else if (ctx.arrayLiteralExpression) return this.visit(ctx.arrayLiteralExpression);
    else {
      throw new Error();
    }
  }

  integerLiteralExpression(ctx: IntegerLiteralExpressionCstChildren) {
    const value: number = parseInt(ctx.IntegerLiteral[0].image);
    return { _name: "integerLiteralExpression", value, type: "int", pos: this.getTokenPos(ctx.IntegerLiteral[0]) };
  }

  floatLiteralExpression(ctx: FloatLiteralExpressionCstChildren) {
    const value: number = parseFloat(ctx.FloatLiteral[0].image);
    return { _name: "floatLiteralExpression", value, type: "float", pos: this.getTokenPos(ctx.FloatLiteral[0]) };
  }

  stringLiteralExpression(ctx: StringLiteralExpressionCstChildren) {
    let value: string = ctx.StringLiteral[0].image.substring(1);
    value = value.substring(0, value.length - 1);
    return { _name: "stringLiteralExpression", value, type: "string", pos: this.getTokenPos(ctx.StringLiteral[0]) };
  }

  boolLiteralExpression(ctx: BoolLiteralExpressionCstChildren): IAstBoolLiteralExpression {
    const token = ctx.True || ctx.False;
    const value: boolean = ctx.True !== undefined;
    return { _name: "boolLiteralExpression", value, type: "bool", pos: this.getTokenPos(token![0]) };
  }

  arrayLiteralExpression(ctx: ArrayLiteralExpressionCstChildren): IAstArrayLiteralExpression {
    const items = ctx.additionExpression.map((itemCtx, i) => this.visit(itemCtx));
    const type = items[0].type;
    items.forEach((item) => {
      if (item.type !== type) this.pushError("Array items must be all same type", item.pos);
    });
    return {
      _name: "arrayLiteralExpression",
      type,
      value: items,
      size: items.length,
      pos: convertCstNodeLocationToIPos(ctx.additionExpression[0].location),
    };
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
    else if (ctx.Float) t = "float";
    else throw new Error();

    return { _name: "typeSpecifier", type: t };
  }

  variableDeclaration(ctx: VariableDeclarationCstChildren): IAstVariableDeclaration {
    const id = ctx.ID[0].image;
    const pos = this.getTokenPos(ctx.ID[0]);
    let type = this.visit(ctx.typeSpecifier).type;

    const arraySize = ctx.arraySize ? this.visit(ctx.arraySize[0]).value : undefined;

    let initExpr = ctx.additionExpression ? this.visit(ctx.additionExpression) : undefined;
    if (initExpr && initExpr.type !== type)
      this.errors.push({
        ...pos,
        code: "2",
        message: `Variable declaration type does not match initiator expression type: ${type} != ${initExpr.type}`,
      });

    if (initExpr && initExpr?.size !== arraySize) {
      this.errors.push({
        ...pos,
        code: "2",
        message: `Variable declaration size does not match initiator expression size: ${arraySize} != ${initExpr.size}`,
      });
    }

    return { _name: "variableDeclaration", id, pos, type, initExpr, size: arraySize };
  }
}

export const cstVisitor = new CstVisitor();
