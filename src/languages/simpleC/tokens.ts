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
const For = createKeywordToken({ name: "For", pattern: /for/ });
const True = createKeywordToken({ name: "True", pattern: /true/ });
const False = createKeywordToken({ name: "False", pattern: /false/ });
const Return = createKeywordToken({ name: "Return", pattern: /return/ });

// types
const Int = createKeywordToken({ name: "Int", pattern: /int/ });
const Float = createKeywordToken({ name: "Float", pattern: /float/ });
const Void = createKeywordToken({ name: "Void", pattern: /void/ });
const String = createKeywordToken({ name: "String", pattern: /string/ });
const Char = createKeywordToken({ name: "Char", pattern: /char/ });
const Bool = createKeywordToken({ name: "Bool", pattern: /bool/ });

const AdditionOperator = createToken({ name: "AdditionOperator", pattern: Lexer.NA });
const MultiplicationOperator = createToken({ name: "MultiplicationOperator", pattern: Lexer.NA });
const ComparisonOperator = createToken({ name: "ComparisonOperator", pattern: Lexer.NA });

// punctuation
const LCurly = createToken({ name: "LCurly", pattern: /{/ });
const RCurly = createToken({ name: "RCurly", pattern: /}/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const LSquare = createToken({ name: "LSquare", pattern: /\[/ });
const RSquare = createToken({ name: "RSquare", pattern: /\]/ });
const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });

const LessThanEqual = createToken({ name: "LessThanEqual", pattern: /<=/, categories: ComparisonOperator });
const LessThan = createToken({ name: "LessThan", pattern: /</, categories: ComparisonOperator });
const GreaterThanEqual = createToken({ name: "GreaterThanEqual", pattern: />=/, categories: ComparisonOperator });
const GreaterThan = createToken({ name: "GreaterThan", pattern: />/, categories: ComparisonOperator });
const EqualsEquals = createToken({ name: "EqualsEquals", pattern: /==/, categories: ComparisonOperator });
const And = createToken({ name: "And", pattern: /&&/, categories: ComparisonOperator });
const Or = createToken({ name: "Or", pattern: /\|\|/, categories: ComparisonOperator });

const Equals = createToken({ name: "Equals", pattern: /=/ });
const PlusPlus = createToken({ name: "PlusPlus", pattern: /\+\+/, categories: AdditionOperator });
const Plus = createToken({ name: "Plus", pattern: /\+/, categories: AdditionOperator });
const MinusMinus = createToken({ name: "MinusMinus", pattern: /--/, categories: AdditionOperator });
const Minus = createToken({ name: "Minus", pattern: /-/, categories: AdditionOperator });
const Times = createToken({ name: "Times", pattern: /\*/, categories: MultiplicationOperator });
const Divide = createToken({ name: "Divide", pattern: /\//, categories: MultiplicationOperator });
const Comma = createToken({ name: "Comma", pattern: /,/ });

// literals
const FloatLiteral = createToken({ name: "FloatLiteral", pattern: /[+-]?([0-9]*[.])?[0-9]+f/ });
const IntegerLiteral = createToken({ name: "IntegerLiteral", pattern: /[0-9]+/ });
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:""|[^"])*"/ });

allTokens.push(ID);

export const tokens = {
  ID,
  // keywords
  If,
  Else,
  While,
  For,
  Return,
  // types
  Int,
  Float,
  Void,
  Bool,
  String,
  Char,
  // Punc
  LCurly,
  RCurly,
  LParen,
  RParen,
  LSquare,
  RSquare,
  SemiColon,
  LessThan,
  LessThanEqual,
  GreaterThan,
  GreaterThanEqual,
  EqualsEquals,
  And,
  Or,
  Equals,
  PlusPlus,
  Plus,
  MinusMinus,
  Minus,
  Times,
  Divide,
  Comma,
  Keyword,
  DocComment,
  LineComment,
  // literals
  StringLiteral,
  FloatLiteral,
  IntegerLiteral,
  True,
  False,
  MultiplicationOperator,
  AdditionOperator,
  ComparisonOperator,
};
