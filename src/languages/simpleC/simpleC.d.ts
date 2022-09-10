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
  variableDeclaration: VariableDeclarationCstNode[];
  LParen: IToken[];
  params?: VariableDeclarationListCstNode[];
  RParen: IToken[];
  blockStatement: BlockStatementCstNode[];
};

export interface VariableDeclarationListCstNode extends CstNode {
  name: "variableDeclarationList";
  children: VariableDeclarationListCstChildren;
}

export type VariableDeclarationListCstChildren = {
  variableDeclaration: VariableDeclarationCstNode[];
  Comma?: IToken[];
};

export interface VariableDeclarationCstNode extends CstNode {
  name: "variableDeclaration";
  children: VariableDeclarationCstChildren;
}

export type VariableDeclarationCstChildren = {
  typeSpecifier: TypeSpecifierCstNode[];
  ID: IToken[];
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
  assignStatement?: AssignStatementCstNode[];
  expressionStatement?: ExpressionStatementCstNode[];
};

export interface IfStatementCstNode extends CstNode {
  name: "ifStatement";
  children: IfStatementCstChildren;
}

export type IfStatementCstChildren = {
  If: IToken[];
  parenExpression: ParenExpressionCstNode[];
  statement: StatementCstNode[];
  Else?: IToken[];
};

export interface WhileStatementCstNode extends CstNode {
  name: "whileStatement";
  children: WhileStatementCstChildren;
}

export type WhileStatementCstChildren = {
  While: IToken[];
  parenExpression: ParenExpressionCstNode[];
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
  parenExpression: ParenExpressionCstNode[];
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
  variableDeclaration: VariableDeclarationCstNode[];
  SemiColon: IToken[];
};

export interface ExpressionStatementCstNode extends CstNode {
  name: "expressionStatement";
  children: ExpressionStatementCstChildren;
}

export type ExpressionStatementCstChildren = {
  additionExpression: AdditionExpressionCstNode[];
  SemiColon: IToken[];
};

export interface AssignStatementCstNode extends CstNode {
  name: "assignStatement";
  children: AssignStatementCstChildren;
}

export type AssignStatementCstChildren = {
  identifierExpression: IdentifierExpressionCstNode[];
  Equals: IToken[];
  additionExpression: AdditionExpressionCstNode[];
  SemiColon: IToken[];
};

export interface AdditionExpressionCstNode extends CstNode {
  name: "additionExpression";
  children: AdditionExpressionCstChildren;
}

export type AdditionExpressionCstChildren = {
  multiplicationExpression: MultiplicationExpressionCstNode[];
  Plus?: IToken[];
  Minus?: IToken[];
};

export interface MultiplicationExpressionCstNode extends CstNode {
  name: "multiplicationExpression";
  children: MultiplicationExpressionCstChildren;
}

export type MultiplicationExpressionCstChildren = {
  atomicExpression: AtomicExpressionCstNode[];
  Times?: IToken[];
  Divide?: IToken[];
};

export interface AtomicExpressionCstNode extends CstNode {
  name: "atomicExpression";
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  unaryExpression?: UnaryExpressionCstNode[];
  functionCallExpression?: FunctionCallExpressionCstNode[];
  identifierExpression?: IdentifierExpressionCstNode[];
  integerLiteralExpression?: IntegerLiteralExpressionCstNode[];
  parenExpression?: ParenExpressionCstNode[];
};

export interface ExpressionListCstNode extends CstNode {
  name: "expressionList";
  children: ExpressionListCstChildren;
}

export type ExpressionListCstChildren = {
  additionExpression: AdditionExpressionCstNode[];
  Comma?: IToken[];
};

export interface FunctionCallExpressionCstNode extends CstNode {
  name: "functionCallExpression";
  children: FunctionCallExpressionCstChildren;
}

export type FunctionCallExpressionCstChildren = {
  identifierExpression: IdentifierExpressionCstNode[];
  LParen: IToken[];
  expressionList?: ExpressionListCstNode[];
  RParen: IToken[];
};

export interface ParenExpressionCstNode extends CstNode {
  name: "parenExpression";
  children: ParenExpressionCstChildren;
}

export type ParenExpressionCstChildren = {
  LParen: IToken[];
  additionExpression: AdditionExpressionCstNode[];
  RParen: IToken[];
};

export interface UnaryExpressionCstNode extends CstNode {
  name: "unaryExpression";
  children: UnaryExpressionCstChildren;
}

export type UnaryExpressionCstChildren = {
  Plus: IToken[];
  additionExpression: AdditionExpressionCstNode[];
};

export interface IdentifierExpressionCstNode extends CstNode {
  name: "identifierExpression";
  children: IdentifierExpressionCstChildren;
}

export type IdentifierExpressionCstChildren = {
  ID: IToken[];
};

export interface IntegerLiteralExpressionCstNode extends CstNode {
  name: "integerLiteralExpression";
  children: IntegerLiteralExpressionCstChildren;
}

export type IntegerLiteralExpressionCstChildren = {
  INT: IToken[];
};

export interface TypeSpecifierCstNode extends CstNode {
  name: "typeSpecifier";
  children: TypeSpecifierCstChildren;
}

export type TypeSpecifierCstChildren = {
  intType?: IToken[];
  voidType?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  program(children: ProgramCstChildren, param?: IN): OUT;
  functionDeclaration(children: FunctionDeclarationCstChildren, param?: IN): OUT;
  variableDeclarationList(children: VariableDeclarationListCstChildren, param?: IN): OUT;
  variableDeclaration(children: VariableDeclarationCstChildren, param?: IN): OUT;
  statement(children: StatementCstChildren, param?: IN): OUT;
  ifStatement(children: IfStatementCstChildren, param?: IN): OUT;
  whileStatement(children: WhileStatementCstChildren, param?: IN): OUT;
  doStatement(children: DoStatementCstChildren, param?: IN): OUT;
  blockStatement(children: BlockStatementCstChildren, param?: IN): OUT;
  variableDeclarationStatement(children: VariableDeclarationStatementCstChildren, param?: IN): OUT;
  expressionStatement(children: ExpressionStatementCstChildren, param?: IN): OUT;
  assignStatement(children: AssignStatementCstChildren, param?: IN): OUT;
  additionExpression(children: AdditionExpressionCstChildren, param?: IN): OUT;
  multiplicationExpression(children: MultiplicationExpressionCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
  expressionList(children: ExpressionListCstChildren, param?: IN): OUT;
  functionCallExpression(children: FunctionCallExpressionCstChildren, param?: IN): OUT;
  parenExpression(children: ParenExpressionCstChildren, param?: IN): OUT;
  unaryExpression(children: UnaryExpressionCstChildren, param?: IN): OUT;
  identifierExpression(children: IdentifierExpressionCstChildren, param?: IN): OUT;
  integerLiteralExpression(children: IntegerLiteralExpressionCstChildren, param?: IN): OUT;
  typeSpecifier(children: TypeSpecifierCstChildren, param?: IN): OUT;
}
