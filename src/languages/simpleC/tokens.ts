import chevrotain, { Lexer } from "chevrotain";

export const allTokens: chevrotain.TokenType[] = [];

// Utility to avoid manually building the allTokens array
function createToken(options: { name: string; pattern: RegExp; group?: string; line_breaks?: boolean }) {
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

// types
const IntType = createKeywordToken({ name: "intType", pattern: /int/ });
const VoidType = createKeywordToken({ name: "voidType", pattern: /void/ });

// punctuation
const LCurly = createToken({ name: "LCurly", pattern: /{/ });
const RCurly = createToken({ name: "RCurly", pattern: /}/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });
const Equals = createToken({ name: "Equals", pattern: /=/ });
const LessThan = createToken({ name: "LessThan", pattern: /</ });
const Plus = createToken({ name: "Plus", pattern: /\+/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Times = createToken({ name: "Times", pattern: /\*/ });
const Divide = createToken({ name: "Divide", pattern: /\// });
const Comma = createToken({ name: "Comma", pattern: /,/ });

// literals
const IntegerLiteral = createToken({ name: "INT", pattern: /[0-9]+/ });

allTokens.push(ID);

export const tokens = {
  ID,
  If,
  Else,
  While,
  Do,
  IntType,
  VoidType,
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
  IntegerLiteral,
  Keyword,
  DocComment,
  LineComment,
};
