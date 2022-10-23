import chevrotain, { Lexer } from "chevrotain";

export const allTokens: chevrotain.TokenType[] = [];

// Utility to avoid manually building the allTokens array
function createToken(options: { name: string; pattern: RegExp; group?: string; categories?: chevrotain.TokenType; line_breaks?: boolean }) {
  const newToken = chevrotain.createToken(options);
  allTokens.push(newToken);
  return newToken;
}

function createKeywordToken(options: { name: string; pattern: RegExp; group?: string }) {
  const newToken = chevrotain.createToken({ ...options, longer_alt: ID, categories: Keyword });
  allTokens.push(newToken);
  return newToken;
}

createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

// comments
const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n\r]*/,
  // group: Lexer.SKIPPED,
});

const DocComment = createToken({
  name: "DocComment",
  pattern: /\/\*\*([^*]|\*(?!\/))*\*\//,
  line_breaks: true,
});

// const DocCommentStart = createToken({ name: "DocCommentStart", pattern: /\/\*\*/ });
// const DocCommentEnd = createToken({ name: "DocCommentEnd", pattern: /\*\// });
// const DocCommentSummary = createToken({ name: "DocCommentSummary", pattern: /\*.*/ });

const ID = chevrotain.createToken({ name: "ID", pattern: /[a-zA-Z_][a-zA-Z_0-9]*/ });

// keywords
const Keyword = createToken({ name: "Keyword", pattern: Lexer.NA });
const If = createKeywordToken({ name: "If", pattern: /if/ });
const Else = createKeywordToken({ name: "Else", pattern: /else/ });
const While = createKeywordToken({ name: "While", pattern: /while/ });
const Do = createKeywordToken({ name: "Do", pattern: /do/ });
const True = createKeywordToken({ name: "True", pattern: /true/ });
const False = createKeywordToken({ name: "False", pattern: /false/ });

// types
const Int = createKeywordToken({ name: "Int", pattern: /int/ });
const Void = createKeywordToken({ name: "Void", pattern: /void/ });
const String = createKeywordToken({ name: "String", pattern: /string/ });
const Bool = createKeywordToken({ name: "Bool", pattern: /bool/ });

const AdditionOperator = createToken({ name: "AdditionOperator", pattern: Lexer.NA });
const MultiplicationOperator = createToken({ name: "MultiplicationOperator", pattern: Lexer.NA });

// punctuation
const LCurly = createToken({ name: "LCurly", pattern: /{/ });
const RCurly = createToken({ name: "RCurly", pattern: /}/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });
const Equals = createToken({ name: "Equals", pattern: /=/ });
const LessThan = createToken({ name: "LessThan", pattern: /</ });
const Plus = createToken({ name: "Plus", pattern: /\+/, categories: AdditionOperator });
const Minus = createToken({ name: "Minus", pattern: /-/, categories: AdditionOperator });
const Times = createToken({ name: "Times", pattern: /\*/, categories: MultiplicationOperator });
const Divide = createToken({ name: "Divide", pattern: /\//, categories: MultiplicationOperator });
const Comma = createToken({ name: "Comma", pattern: /,/ });

// literals
const IntegerLiteral = createToken({ name: "IntegerLiteral", pattern: /[0-9]+/ });
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:""|[^"])*"/ });

allTokens.push(ID);

export const tokens = {
  ID,
  // keywords
  If,
  Else,
  While,
  Do,
  // types
  Int,
  Void,
  Bool,
  String,
  // Punc
  LCurly,
  RCurly,
  LParen,
  RParen,
  SemiColon,
  Equals,
  LessThan,
  Plus,
  Minus,
  Times,
  Divide,
  Comma,
  Keyword,
  DocComment,
  LineComment,
  // literals
  StringLiteral,
  IntegerLiteral,
  True,
  False,
  MultiplicationOperator,
  AdditionOperator,
};
