/**
 * A parser for the SimpleC programing language
 * https://tomassetti.me/ebnf/#examples (Scroll down a bit)
 */

import chevrotain, { Lexer, CstParser, Rule, defaultLexerErrorProvider } from "chevrotain";

// ----------------- lexer -----------------
const allTokens: chevrotain.TokenType[] = [];

// Utility to avoid manually building the allTokens array
function createToken(options: { name: string; pattern: RegExp; group?: string }) {
  const newToken = chevrotain.createToken(options);
  allTokens.push(newToken);
  return newToken;
}

function createKeywordToken(options: { name: string; pattern: RegExp; group?: string }) {
  const newToken = chevrotain.createToken({ ...options, longer_alt: ID });
  allTokens.push(newToken);
  return newToken;
}

createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

const ID = chevrotain.createToken({ name: "ID", pattern: /[a-zA-Z_][a-zA-Z_0-9]*/ });

const If = createKeywordToken({ name: "If", pattern: /if/ });
const Else = createKeywordToken({ name: "Else", pattern: /else/ });
const While = createKeywordToken({ name: "While", pattern: /while/ });
const Do = createKeywordToken({ name: "Do", pattern: /do/ });

const IntType = createKeywordToken({ name: "intType", pattern: /int/ });
const VoidType = createKeywordToken({ name: "voidType", pattern: /void/ });

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
const INT = createToken({ name: "INT", pattern: /[0-9]+/ });

allTokens.push(ID);

const SimpleCLexer = new Lexer(allTokens);

// ----------------- parser -----------------

class SimpleCParser extends CstParser {
  constructor() {
    super(allTokens, { nodeLocationTracking: "full" });
    this.performSelfAnalysis();
  }

  public program = this.RULE("program", () => {
    this.MANY(() => {
      this.SUBRULE(this.functionDeclaration);
    });
    this.MANY2(() => {
      this.SUBRULE(this.statement);
    });
  });

  public functionDeclaration = this.RULE("functionDeclaration", () => {
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.variableDeclarationList, { LABEL: "params" });
    });
    this.CONSUME(RParen);
    this.SUBRULE(this.blockStatement);
  });

  public variableDeclarationList = this.RULE("variableDeclarationList", () => {
    this.SUBRULE(this.variableDeclaration);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.variableDeclaration);
    });
  });

  public variableDeclaration = this.RULE("variableDeclaration", () => {
    this.SUBRULE(this.typeSpecifier);
    this.CONSUME(ID);
  });

  public statement = this.RULE("statement", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.whileStatement) },
      { ALT: () => this.SUBRULE(this.doStatement) },
      { ALT: () => this.SUBRULE(this.blockStatement) },
      { ALT: () => this.SUBRULE(this.variableDeclarationStatement) },
      { ALT: () => this.SUBRULE(this.assignStatement) },
      { ALT: () => this.SUBRULE(this.expressionStatement) },
    ]);
  });

  public ifStatement = this.RULE("ifStatement", () => {
    this.CONSUME(If);
    this.SUBRULE(this.parenExpression);
    this.SUBRULE(this.statement);
    this.OPTION(() => {
      this.CONSUME(Else);
      this.SUBRULE2(this.statement);
    });
  });

  public whileStatement = this.RULE("whileStatement", () => {
    this.CONSUME(While);
    this.SUBRULE(this.parenExpression);
    this.SUBRULE(this.statement);
  });

  public doStatement = this.RULE("doStatement", () => {
    this.CONSUME(Do);
    this.SUBRULE(this.statement);
    this.CONSUME(While);
    this.SUBRULE(this.parenExpression);
    this.CONSUME(SemiColon);
  });

  public blockStatement = this.RULE("blockStatement", () => {
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RCurly);
  });

  public variableDeclarationStatement = this.RULE("variableDeclarationStatement", () => {
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(SemiColon);
  });

  public expressionStatement = this.RULE("expressionStatement", () => {
    this.SUBRULE(this.additionExpression);
    this.CONSUME(SemiColon);
  });

  public assignStatement = this.RULE("assignStatement", () => {
    this.SUBRULE(this.identifierExpression);
    this.CONSUME(Equals);
    this.SUBRULE(this.additionExpression);
    this.CONSUME(SemiColon);
  });

  // Expressions

  public additionExpression = this.RULE("additionExpression", () => {
    this.SUBRULE(this.multiplicationExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Plus) }, { ALT: () => this.CONSUME(Minus) }]);
      this.SUBRULE2(this.multiplicationExpression);
    });
  });

  public multiplicationExpression = this.RULE("multiplicationExpression", () => {
    this.SUBRULE(this.atomicExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Times) }, { ALT: () => this.CONSUME(Divide) }]);
      this.SUBRULE2(this.atomicExpression);
    });
  });

  public atomicExpression = this.RULE("atomicExpression", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.unaryExpression) },
      { ALT: () => this.SUBRULE(this.functionCallExpression) },
      { ALT: () => this.SUBRULE(this.identifierExpression) },
      { ALT: () => this.SUBRULE(this.integerLiteralExpression) },
      { ALT: () => this.SUBRULE(this.parenExpression) },
    ]);
  });

  public expressionList = this.RULE("expressionList", () => {
    this.SUBRULE(this.additionExpression);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.additionExpression);
    });
  });

  // atomics

  public functionCallExpression = this.RULE("functionCallExpression", () => {
    this.SUBRULE(this.identifierExpression);
    this.CONSUME(LParen);
    this.OPTION(() => this.SUBRULE(this.expressionList));
    this.CONSUME(RParen);
  });

  public parenExpression = this.RULE("parenExpression", () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.additionExpression);
    this.CONSUME(RParen);
  });

  public unaryExpression = this.RULE("unaryExpression", () => {
    this.CONSUME(Plus);
    this.SUBRULE(this.additionExpression);
  });

  public identifierExpression = this.RULE("identifierExpression", () => {
    this.CONSUME(ID);
  });

  public integerLiteralExpression = this.RULE("integerLiteralExpression", () => {
    this.CONSUME(INT);
  });

  // ------------------ utils ----------------------------------

  public typeSpecifier = this.RULE("typeSpecifier", () => {
    this.OR([{ ALT: () => this.CONSUME(IntType) }, { ALT: () => this.CONSUME(VoidType) }]);
  });
}

// run

const parserInstance = new SimpleCParser();
export const productions: Record<string, Rule> = parserInstance.getGAstProductions();

import { generateCstDts } from "chevrotain";
const dtsString = generateCstDts(productions, { includeVisitorInterface: true });
console.log({ dst: dtsString });

export const parse = (text: string) => {
  const lexResult = SimpleCLexer.tokenize(text);

  // setting a new input will RESET the parser instance's state.
  parserInstance.input = lexResult.tokens;

  // any top level rule may be used as an entry point
  const cst = parserInstance.program();

  return {
    cst,
    lexErrors: lexResult.errors,
    parseErrors: parserInstance.errors,
  };
};

export default {
  parserInstance,
  SimpleCParser,
  parse,
};
