import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import { ScopeStack } from "./ScopeStack";

export type IDeclarationType = "int" | "string" | "bool" | "void" | "float" | "char";
export type IDeclarationValue = number | string | boolean | undefined;

export interface IPos {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

export interface IAstResult {
  ast: IAstProgram;
  scopeStack: ScopeStack;
  errors: ISimpleCLangError[];
}

export interface IAstNode {
  _name: string;
  pos?: IPos;
}

export interface IAstStatement extends IAstNode {}

export interface IAstBlock extends IAstNode {
  _name: "block";
  statements: IAstStatement[];
  heapVars: string[];
}

export interface IAstIfStatement extends IAstStatement {
  _name: "ifStatement";
  cond: IAstExpression;
  then: IAstStatement;
  else?: IAstStatement;
}

export interface IAstForStatement extends IAstStatement {
  _name: "forStatement";
  init: IAstStatement;
  test: IAstComparisonExpression;
  step: IAstStatement;
  loop: IAstStatement;
}

export interface IAstWhileStatement extends IAstStatement {
  _name: "whileStatement";
  test: IAstComparisonExpression;
  loop: IAstStatement;
}

export interface IAstDeclaration extends IAstNode {
  id: string;
  type: IDeclarationType;
  size?: number;
  docComment?: IAstDocComment;
  pos: IPos;
}

export interface IAstVariableDeclaration extends IAstDeclaration {
  _name: "variableDeclaration";
  initExpr?: IAstExpression;
  pos: IPos;
}

export interface IAstFunctionDeclaration extends IAstDeclaration {
  _name: "functionDeclaration";
  params: IAstVariableDeclaration[];
  block?: IAstBlock;
}

export interface IAstReturnStatement extends IAstStatement {
  _name: "returnStatement";
  lhs?: IAstExpression;
}

export interface IAstExpression extends IAstNode {
  _name:
    | "integerLiteralExpression"
    | "floatLiteralExpression"
    | "boolLiteralExpression"
    | "arrayLiteralExpression"
    | "identifierExpression"
    | "stringLiteralExpression"
    | "functionCallExpression"
    | "floatBinaryExpression"
    | "intBinaryExpression"
    | "invalidExpression"
    | "castExpression"
    | "ternExpression";
  type: IDeclarationType;
  pos: IPos;
}

export interface IAstInvalidExpression extends IAstExpression {
  _name: "invalidExpression";
  type: "int";
}

export interface IAstIdentifierExpression extends IAstDeclaration, IAstExpression {
  _name: "identifierExpression";
  id: string;
  type: IDeclarationType;
  index?: number;
  size?: number;
}

export interface IAstFunctionCallExpression extends IAstExpression {
  _name: "functionCallExpression";
  id: string;
  size?: number;
  index?: number;
  params: IAstExpression[];
  type: IDeclarationType;
}

export interface IAstUnaryExpression extends IAstExpression {}
export interface IAstCastExpression extends IAstExpression {
  _name: "castExpression";
  lhs: IAstExpression;
  type: "float" | "int";
}

export interface IAstTernExpression extends IAstExpression {
  _name: "ternExpression";
  cond: IAstExpression;
  e0: IAstExpression;
  e1: IAstExpression;
  type: "float" | "int" | "bool";
}

export interface IAstLiteralExpression extends IAstExpression {
  value: number | boolean | string;
  type: "int" | "bool" | "float" | "string";
}

export interface IAstNonStringLiteralExpression extends IAstExpression {
  value: number | boolean;
  type: "int" | "bool" | "float";
}

export interface IAstIntegerLiteralExpression extends IAstLiteralExpression {
  _name: "integerLiteralExpression";
  value: number;
  type: "int";
}

export interface IAstBoolLiteralExpression extends IAstLiteralExpression {
  _name: "boolLiteralExpression";
  value: boolean;
  type: "bool";
}

export interface IAstStringLiteralExpression extends IAstLiteralExpression {
  _name: "stringLiteralExpression";
  value: string;
  type: "string";
}

export interface IAstArrayLiteralExpression extends IAstExpression {
  _name: "arrayLiteralExpression";
  value: Array<IAstExpression>;
  size: number;
}

export type IAstAtomicExpression = IAstIdentifierExpression | IAstLiteralExpression | IAstFunctionCallExpression | IAstUnaryExpression;

export type IAstIntArthimeticOperator = "add" | "sub" | "mul" | "div";
export type IAstFloatArthimeticOperator = "fadd" | "fsub" | "fmul" | "fdiv";
export type IAstIntComparisonOperator = "gt" | "lt" | "ge" | "le" | "eq";
export type IAstFloatComparisonOperator = "fgt" | "flt" | "fge" | "fle" | "feq";

export interface IAstComparisonExpression {
  _name: "comparisonExpression";
  lhs: IAstExpression;
  rhs?: IAstExpression;
  op: IAstIntComparisonOperator | IAstFloatComparisonOperator;
  type: "bool";
}

export interface IAstIntComparisonExpression extends IAstComparisonExpression {
  op: IAstIntComparisonOperator;
}

export interface IAstFloatComparisonExpression extends IAstComparisonExpression {
  op: IAstFloatComparisonOperator;
}

export interface IAstBinaryExpression extends IAstExpression {
  _name: "intBinaryExpression" | "floatBinaryExpression";
  lhs: IAstExpression;
  rhs: IAstExpression;
  op: IAstIntArthimeticOperator | IAstFloatArthimeticOperator;
  type: "int" | "float";
}

export interface IAstIntBinaryExpression extends IAstBinaryExpression {
  _name: "intBinaryExpression";
  op: IAstIntArthimeticOperator;
  type: "int";
}

export interface IAstFloatBinaryExpression extends IAstBinaryExpression {
  _name: "floatBinaryExpression";
  op: IAstFloatArthimeticOperator;
  type: "float";
}

export interface IAstAssignStatement extends IAstNode {
  _name: "assignStatement";
  lhs: IAstIdentifierExpression;
  rhs: IAstExpression;
}

export interface IAstProgram extends IAstNode {
  functionDeclarations: IAstFunctionDeclaration[];
  // rootLevelStatements: IAstStatement[];
}

export interface IAstDocComment extends IAstNode {
  desc: string;
  params: string[];
  returns: string;
}

export const parseDocCommentString = (mycomment: string): IAstDocComment => {
  // From: https://doc.esdoc.org/github.com/esdoc/esdoc/file/src/Parser/CommentParser.js.html
  let comment = mycomment;

  // TODO: refactor
  comment = comment.replace(/\r\n/gm, "\n"); // for windows
  comment = comment.replace(/\/\*\*/, ""); // remove /**
  comment = comment.replace(/\*\/$/, ""); // remove */ at end
  comment = comment.replace(/^[\t \n]*/gm, ""); // remove line head space
  comment = comment.replace(/^\*[\t ]?/, ""); // remove first '*'
  comment = comment.replace(/[\t ]$/, ""); // remove last space
  comment = comment.replace(/^\*[\t ]?/gm, ""); // remove line head '*'
  if (comment.charAt(0) !== "@") comment = `@desc ${comment}`; // auto insert @desc
  comment = comment.replace(/[\t ]*$/, ""); // remove tail space.
  comment = comment.replace(/```[\s\S]*?```/g, (match) => match.replace(/@/g, "\\ESCAPED_AT\\")); // escape code in descriptions
  comment = comment.replace(/^[\t ]*(@\w+)$/gm, "$1 \\TRUE"); // auto insert tag text to non-text tag (e.g. @interface)
  comment = comment.replace(/^[\t ]*(@\w+)[\t ](.*)/gm, "\\Z$1\\Z$2"); // insert separator (\\Z@tag\\Ztext)

  const lines = comment.split("\\Z");

  let tagName = "";
  let tagValue = "";
  const tags = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.charAt(0) === "@") {
      tagName = line;
      const nextLine = lines[i + 1];
      if (nextLine.charAt(0) === "@") {
        tagValue = "";
      } else {
        tagValue = nextLine;
        i++;
      }
      tagValue = tagValue
        .replace("\\TRUE", "")
        .replace(/\\ESCAPED_AT\\/g, "@")
        .replace(/^\n/, "")
        .replace(/\n*$/, "");
      tags.push({ tagName, tagValue });
    }
  }

  return {
    _name: "docComment",
    desc: tags.find((t) => t.tagName == "@desc")?.tagValue || "No description",
    params: tags.filter((t) => t.tagName == "@param")?.map((t) => t.tagValue) || [],
    returns: tags.find((t) => t.tagName == "@returns")?.tagValue || "void",
  };
};

export const convertDocCommentToSuggestionString = (doc: IAstDocComment | undefined): string => {
  if (!doc) return "";
  return `${doc.desc}\n\n${doc.params.map((p) => "_@param_ " + p + "\n")}\nreturns ${doc.returns}`;
};

export const convertVariableDeclarationToSuggestionString = (decl: IAstVariableDeclaration) => {
  return `${decl.type} ${decl.id}`;
};

export const convertFunctionDeclarationToSuggestionString = (decl: IAstFunctionDeclaration) => {
  let res = `${decl.type} ${decl.id} (${decl.params.map((p) => p.toString()).join(", ")})`;
  if (decl.docComment) res += "\n\n" + convertDocCommentToSuggestionString(decl.docComment);
  return res;
};
