import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface ProgramCstNode extends CstNode {
  name: "program";
  children: ProgramCstChildren;
}

export type ProgramCstChildren = {
  functionDeclaration?: FunctionDeclarationCstNode[];
  statement?: StatementCstNode[];
};

export interface FunctionDeclarationCstNode extends CstNode {
  name: "functionDeclaration";
  children: FunctionDeclarationCstChildren;
}

export type FunctionDeclarationCstChildren = {
  typeDeclaration: TypeDeclarationCstNode[];
  ID: IToken[];
  LParen: IToken[];
  parameterList?: ParameterListCstNode[];
  RParen: IToken[];
  blockStatement: BlockStatementCstNode[];
};

export interface StatementCstNode extends CstNode {
  name: "statement";
  children: StatementCstChildren;
}

export type StatementCstChildren = {
  ifStatement?: IfStatementCstNode[];
  whileStatement?: WhileStatementCstNode[];
  doStatement?: DoStatementCstNode[];
  blockStatement?: BlockStatementCstNode[];
  variableDeclarationStatement?: VariableDeclarationStatementCstNode[];
  expressionStatement?: ExpressionStatementCstNode[];
  emptyStatement?: EmptyStatementCstNode[];
};

export interface IfStatementCstNode extends CstNode {
  name: "ifStatement";
  children: IfStatementCstChildren;
}

export type IfStatementCstChildren = {
  If: IToken[];
  paren_expr: Paren_exprCstNode[];
  statement: StatementCstNode[];
  Else?: IToken[];
};

export interface WhileStatementCstNode extends CstNode {
  name: "whileStatement";
  children: WhileStatementCstChildren;
}

export type WhileStatementCstChildren = {
  While: IToken[];
  paren_expr: Paren_exprCstNode[];
  statement: StatementCstNode[];
};

export interface DoStatementCstNode extends CstNode {
  name: "doStatement";
  children: DoStatementCstChildren;
}

export type DoStatementCstChildren = {
  Do: IToken[];
  statement: StatementCstNode[];
  While: IToken[];
  paren_expr: Paren_exprCstNode[];
  SemiColon: IToken[];
};

export interface BlockStatementCstNode extends CstNode {
  name: "blockStatement";
  children: BlockStatementCstChildren;
}

export type BlockStatementCstChildren = {
  LCurly: IToken[];
  statement?: StatementCstNode[];
  RCurly: IToken[];
};

export interface VariableDeclarationStatementCstNode extends CstNode {
  name: "variableDeclarationStatement";
  children: VariableDeclarationStatementCstChildren;
}

export type VariableDeclarationStatementCstChildren = {
  intType: IToken[];
  ID: IToken[];
};

export interface ExpressionStatementCstNode extends CstNode {
  name: "expressionStatement";
  children: ExpressionStatementCstChildren;
}

export type ExpressionStatementCstChildren = {
  expression: ExpressionCstNode[];
  SemiColon: IToken[];
};

export interface ExpressionCstNode extends CstNode {
  name: "expression";
  children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
  functionCallExpression?: FunctionCallExpressionCstNode[];
  assignExpression?: AssignExpressionCstNode[];
  relationExpression?: RelationExpressionCstNode[];
};

export interface RelationExpressionCstNode extends CstNode {
  name: "relationExpression";
  children: RelationExpressionCstChildren;
}

export type RelationExpressionCstChildren = {
  AdditionExpression: AdditionExpressionCstNode[];
  LessThan?: IToken[];
};

export interface FunctionCallExpressionCstNode extends CstNode {
  name: "functionCallExpression";
  children: FunctionCallExpressionCstChildren;
}

export type FunctionCallExpressionCstChildren = {
  ID: IToken[];
  LParen: IToken[];
  parameterList: ParameterListCstNode[];
  RParen: IToken[];
};

export interface AdditionExpressionCstNode extends CstNode {
  name: "AdditionExpression";
  children: AdditionExpressionCstChildren;
}

export type AdditionExpressionCstChildren = {
  term: TermCstNode[];
  Plus?: IToken[];
  Minus?: IToken[];
};

export interface AssignExpressionCstNode extends CstNode {
  name: "assignExpression";
  children: AssignExpressionCstChildren;
}

export type AssignExpressionCstChildren = {
  ID: IToken[];
  Equals: IToken[];
  expression: ExpressionCstNode[];
};

export interface TermCstNode extends CstNode {
  name: "term";
  children: TermCstChildren;
}

export type TermCstChildren = {
  ID?: IToken[];
  INT?: IToken[];
  paren_expr?: Paren_exprCstNode[];
};

export interface Paren_exprCstNode extends CstNode {
  name: "paren_expr";
  children: Paren_exprCstChildren;
}

export type Paren_exprCstChildren = {
  LParen: IToken[];
  expression: ExpressionCstNode[];
  RParen: IToken[];
};

export interface EmptyStatementCstNode extends CstNode {
  name: "emptyStatement";
  children: EmptyStatementCstChildren;
}

export type EmptyStatementCstChildren = {
  SemiColon: IToken[];
};

export interface ParameterListCstNode extends CstNode {
  name: "parameterList";
  children: ParameterListCstChildren;
}

export type ParameterListCstChildren = {
  ID: IToken[];
  Comma?: IToken[];
};

export interface TypeDeclarationCstNode extends CstNode {
  name: "typeDeclaration";
  children: TypeDeclarationCstChildren;
}

export type TypeDeclarationCstChildren = {
  intType?: IToken[];
  voidType?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  program(children: ProgramCstChildren, param?: IN): OUT;
  functionDeclaration(children: FunctionDeclarationCstChildren, param?: IN): OUT;
  statement(children: StatementCstChildren, param?: IN): OUT;
  ifStatement(children: IfStatementCstChildren, param?: IN): OUT;
  whileStatement(children: WhileStatementCstChildren, param?: IN): OUT;
  doStatement(children: DoStatementCstChildren, param?: IN): OUT;
  blockStatement(children: BlockStatementCstChildren, param?: IN): OUT;
  variableDeclarationStatement(children: VariableDeclarationStatementCstChildren, param?: IN): OUT;
  expressionStatement(children: ExpressionStatementCstChildren, param?: IN): OUT;
  expression(children: ExpressionCstChildren, param?: IN): OUT;
  relationExpression(children: RelationExpressionCstChildren, param?: IN): OUT;
  functionCallExpression(children: FunctionCallExpressionCstChildren, param?: IN): OUT;
  AdditionExpression(children: AdditionExpressionCstChildren, param?: IN): OUT;
  assignExpression(children: AssignExpressionCstChildren, param?: IN): OUT;
  term(children: TermCstChildren, param?: IN): OUT;
  paren_expr(children: Paren_exprCstChildren, param?: IN): OUT;
  emptyStatement(children: EmptyStatementCstChildren, param?: IN): OUT;
  parameterList(children: ParameterListCstChildren, param?: IN): OUT;
  typeDeclaration(children: TypeDeclarationCstChildren, param?: IN): OUT;
}
