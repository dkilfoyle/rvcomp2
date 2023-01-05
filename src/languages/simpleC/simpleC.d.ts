import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface ProgramCstNode extends CstNode {
  name: "program";
  children: ProgramCstChildren;
}

export type ProgramCstChildren = {
  functionDeclaration?: FunctionDeclarationCstNode[];
};

export interface FunctionDeclarationCstNode extends CstNode {
  name: "functionDeclaration";
  children: FunctionDeclarationCstChildren;
}

export type FunctionDeclarationCstChildren = {
  DocComment?: IToken[];
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
  LSquare?: IToken[];
  arraySize?: IntegerLiteralExpressionCstNode[];
  RSquare?: IToken[];
  ID: IToken[];
  Equals?: IToken[];
  additionExpression?: AdditionExpressionCstNode[];
};

export interface StatementCstNode extends CstNode {
  name: "statement";
  children: StatementCstChildren;
}

export type StatementCstChildren = {
  ifStatement?: IfStatementCstNode[];
  forStatement?: ForStatementCstNode[];
  whileStatement?: WhileStatementCstNode[];
  blockStatement?: BlockStatementCstNode[];
  variableDeclarationStatement?: VariableDeclarationStatementCstNode[];
  assignStatement?: AssignStatementCstNode[];
  functionCallStatement?: FunctionCallStatementCstNode[];
  returnStatement?: ReturnStatementCstNode[];
};

export interface IfStatementCstNode extends CstNode {
  name: "ifStatement";
  children: IfStatementCstChildren;
}

export type IfStatementCstChildren = {
  If: IToken[];
  LParen: IToken[];
  testExpression: AdditionExpressionCstNode[];
  RParen: IToken[];
  thenStatement: StatementCstNode[];
  Else?: IToken[];
  elseStatement?: StatementCstNode[];
};

export interface WhileStatementCstNode extends CstNode {
  name: "whileStatement";
  children: WhileStatementCstChildren;
}

export type WhileStatementCstChildren = {
  While: IToken[];
  LParen: IToken[];
  comparisonExpression: ComparisonExpressionCstNode[];
  RParen: IToken[];
  statement: StatementCstNode[];
};

export interface ForStatementCstNode extends CstNode {
  name: "forStatement";
  children: ForStatementCstChildren;
}

export type ForStatementCstChildren = {
  For: IToken[];
  LParen: IToken[];
  initStatement: StatementCstNode[];
  test: ComparisonExpressionCstNode[];
  SemiColon: IToken[];
  stepStatement: StatementCstNode[];
  RParen: IToken[];
  loopStatement: StatementCstNode[];
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

export interface FunctionCallStatementCstNode extends CstNode {
  name: "functionCallStatement";
  children: FunctionCallStatementCstChildren;
}

export type FunctionCallStatementCstChildren = {
  functionCallExpression: FunctionCallExpressionCstNode[];
  SemiColon: IToken[];
};

export interface ReturnStatementCstNode extends CstNode {
  name: "returnStatement";
  children: ReturnStatementCstChildren;
}

export type ReturnStatementCstChildren = {
  Return: IToken[];
  additionExpression?: AdditionExpressionCstNode[];
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

export interface ComparisonExpressionCstNode extends CstNode {
  name: "comparisonExpression";
  children: ComparisonExpressionCstChildren;
}

export type ComparisonExpressionCstChildren = {
  operands: MultiplicationExpressionCstNode[];
  operators?: IToken[];
};

export interface AdditionExpressionCstNode extends CstNode {
  name: "additionExpression";
  children: AdditionExpressionCstChildren;
}

export type AdditionExpressionCstChildren = {
  operands: ComparisonExpressionCstNode[];
  operators?: IToken[];
};

export interface MultiplicationExpressionCstNode extends CstNode {
  name: "multiplicationExpression";
  children: MultiplicationExpressionCstChildren;
}

export type MultiplicationExpressionCstChildren = {
  operands: AtomicExpressionCstNode[];
  operators?: IToken[];
};

export interface AtomicExpressionCstNode extends CstNode {
  name: "atomicExpression";
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  unaryExpression?: UnaryExpressionCstNode[];
  functionCallExpression?: FunctionCallExpressionCstNode[];
  identifierExpression?: IdentifierExpressionCstNode[];
  literalExpression?: LiteralExpressionCstNode[];
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
  ID: IToken[];
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
  LSquare?: IToken[];
  arrayIndex?: IntegerLiteralExpressionCstNode[];
  RSquare?: IToken[];
};

export interface LiteralExpressionCstNode extends CstNode {
  name: "literalExpression";
  children: LiteralExpressionCstChildren;
}

export type LiteralExpressionCstChildren = {
  integerLiteralExpression?: IntegerLiteralExpressionCstNode[];
  stringLiteralExpression?: StringLiteralExpressionCstNode[];
  boolLiteralExpression?: BoolLiteralExpressionCstNode[];
};

export interface IntegerLiteralExpressionCstNode extends CstNode {
  name: "integerLiteralExpression";
  children: IntegerLiteralExpressionCstChildren;
}

export type IntegerLiteralExpressionCstChildren = {
  IntegerLiteral: IToken[];
};

export interface StringLiteralExpressionCstNode extends CstNode {
  name: "stringLiteralExpression";
  children: StringLiteralExpressionCstChildren;
}

export type StringLiteralExpressionCstChildren = {
  StringLiteral: IToken[];
};

export interface BoolLiteralExpressionCstNode extends CstNode {
  name: "boolLiteralExpression";
  children: BoolLiteralExpressionCstChildren;
}

export type BoolLiteralExpressionCstChildren = {
  True?: IToken[];
  False?: IToken[];
};

export interface TypeSpecifierCstNode extends CstNode {
  name: "typeSpecifier";
  children: TypeSpecifierCstChildren;
}

export type TypeSpecifierCstChildren = {
  Int?: IToken[];
  Void?: IToken[];
  String?: IToken[];
  Bool?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  program(children: ProgramCstChildren, param?: IN): OUT;
  functionDeclaration(children: FunctionDeclarationCstChildren, param?: IN): OUT;
  variableDeclarationList(children: VariableDeclarationListCstChildren, param?: IN): OUT;
  variableDeclaration(children: VariableDeclarationCstChildren, param?: IN): OUT;
  statement(children: StatementCstChildren, param?: IN): OUT;
  ifStatement(children: IfStatementCstChildren, param?: IN): OUT;
  whileStatement(children: WhileStatementCstChildren, param?: IN): OUT;
  forStatement(children: ForStatementCstChildren, param?: IN): OUT;
  blockStatement(children: BlockStatementCstChildren, param?: IN): OUT;
  variableDeclarationStatement(children: VariableDeclarationStatementCstChildren, param?: IN): OUT;
  functionCallStatement(children: FunctionCallStatementCstChildren, param?: IN): OUT;
  returnStatement(children: ReturnStatementCstChildren, param?: IN): OUT;
  assignStatement(children: AssignStatementCstChildren, param?: IN): OUT;
  comparisonExpression(children: ComparisonExpressionCstChildren, param?: IN): OUT;
  additionExpression(children: AdditionExpressionCstChildren, param?: IN): OUT;
  multiplicationExpression(children: MultiplicationExpressionCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
  expressionList(children: ExpressionListCstChildren, param?: IN): OUT;
  functionCallExpression(children: FunctionCallExpressionCstChildren, param?: IN): OUT;
  parenExpression(children: ParenExpressionCstChildren, param?: IN): OUT;
  unaryExpression(children: UnaryExpressionCstChildren, param?: IN): OUT;
  identifierExpression(children: IdentifierExpressionCstChildren, param?: IN): OUT;
  literalExpression(children: LiteralExpressionCstChildren, param?: IN): OUT;
  integerLiteralExpression(children: IntegerLiteralExpressionCstChildren, param?: IN): OUT;
  stringLiteralExpression(children: StringLiteralExpressionCstChildren, param?: IN): OUT;
  boolLiteralExpression(children: BoolLiteralExpressionCstChildren, param?: IN): OUT;
  typeSpecifier(children: TypeSpecifierCstChildren, param?: IN): OUT;
}
