import { isReactNodeEmpty } from "@blueprintjs/core/lib/esm/common/utils";
import { ISimpleCLangError } from "../../components/simpleCEditor/monaco/DiagnosticsAdapter";
import { ScopeStack } from "./ScopeStack";

export type IDeclarationType = "int" | "string" | "bool" | "void";
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
}

export interface IAstForStatement extends IAstStatement {
  _name: "for";
}

export interface IAstDeclaration extends IAstNode {
  id: string;
  type: IDeclarationType;
  docComment?: IAstDocComment;
}

export interface IAstVariableDeclaration extends IAstDeclaration {
  _name: "variableDeclaration";
  initValue?: IDeclarationValue;
}

export interface IAstFunctionDeclaration extends IAstDeclaration {
  _name: "functionDeclaration";
  params: IAstVariableDeclaration[];
  block?: IAstBlock;
}

export interface IAstExpression extends IAstNode {}

export interface IAstIdentifierExpression extends IAstDeclaration, IAstExpression {}

export interface IAstLiteralExpression extends IAstExpression {}
export interface IAstFunctionCallExpression extends IAstExpression {}
export interface IAstParenExpression extends IAstExpression {}
export interface IAstLiteralExpression extends IAstExpression {}
export interface IAstUnaryExpression extends IAstExpression {}

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

export type IAstAtomicExpression =
  | IAstIdentifierExpression
  | IAstLiteralExpression
  | IAstFunctionCallExpression
  | IAstParenExpression
  | IAstUnaryExpression;

export interface IAstMultiplicationExpression extends IAstExpression {
  _name: "multiplicationExpression";
  lhs: IAstAtomicExpression;
  rhs?: IAstAtomicExpression;
  op: "*" | "/";
}

export interface IAstAdditionExpression extends IAstNode {
  _name: "additionExpression";
  lhs: IAstExpression;
  rhs?: IAstExpression;
  op: "+" | "-";
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
