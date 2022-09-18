/**
 * A parser for the SimpleC programing language
 * https://tomassetti.me/ebnf/#examples (Scroll down a bit)
 */

import chevrotain, { CstParser, Rule } from "chevrotain";
import { tokens, allTokens } from "./tokens";
import { SimpleCLexer } from "./lexer";

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
    this.CONSUME(tokens.LParen);
    this.OPTION(() => {
      this.SUBRULE(this.variableDeclarationList, { LABEL: "params" });
    });
    this.CONSUME(tokens.RParen);
    this.SUBRULE(this.blockStatement);
  });

  public variableDeclarationList = this.RULE("variableDeclarationList", () => {
    this.SUBRULE(this.variableDeclaration);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.variableDeclaration);
    });
  });

  public variableDeclaration = this.RULE("variableDeclaration", () => {
    this.SUBRULE(this.typeSpecifier);
    this.CONSUME(tokens.ID);
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
    this.CONSUME(tokens.If);
    this.SUBRULE(this.parenExpression);
    this.SUBRULE(this.statement);
    this.OPTION(() => {
      this.CONSUME(tokens.Else);
      this.SUBRULE2(this.statement);
    });
  });

  public whileStatement = this.RULE("whileStatement", () => {
    this.CONSUME(tokens.While);
    this.SUBRULE(this.parenExpression);
    this.SUBRULE(this.statement);
  });

  public doStatement = this.RULE("doStatement", () => {
    this.CONSUME(tokens.Do);
    this.SUBRULE(this.statement);
    this.CONSUME(tokens.While);
    this.SUBRULE(this.parenExpression);
    this.CONSUME(tokens.SemiColon);
  });

  public blockStatement = this.RULE("blockStatement", () => {
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(tokens.RCurly);
  });

  public variableDeclarationStatement = this.RULE("variableDeclarationStatement", () => {
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(tokens.SemiColon);
  });

  public expressionStatement = this.RULE("expressionStatement", () => {
    this.SUBRULE(this.additionExpression);
    this.CONSUME(tokens.SemiColon);
  });

  public assignStatement = this.RULE("assignStatement", () => {
    this.SUBRULE(this.identifierExpression);
    this.CONSUME(tokens.Equals);
    this.SUBRULE(this.additionExpression);
    this.CONSUME(tokens.SemiColon);
  });

  // Expressions

  public additionExpression = this.RULE("additionExpression", () => {
    this.SUBRULE(this.multiplicationExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(tokens.Plus) }, { ALT: () => this.CONSUME(tokens.Minus) }]);
      this.SUBRULE2(this.multiplicationExpression);
    });
  });

  public multiplicationExpression = this.RULE("multiplicationExpression", () => {
    this.SUBRULE(this.atomicExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(tokens.Times) }, { ALT: () => this.CONSUME(tokens.Divide) }]);
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
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.additionExpression);
    });
  });

  // atomics

  public functionCallExpression = this.RULE("functionCallExpression", () => {
    this.SUBRULE(this.identifierExpression);
    this.CONSUME(tokens.LParen);
    this.OPTION(() => this.SUBRULE(this.expressionList));
    this.CONSUME(tokens.RParen);
  });

  public parenExpression = this.RULE("parenExpression", () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.additionExpression);
    this.CONSUME(tokens.RParen);
  });

  public unaryExpression = this.RULE("unaryExpression", () => {
    this.CONSUME(tokens.Plus);
    this.SUBRULE(this.additionExpression);
  });

  public identifierExpression = this.RULE("identifierExpression", () => {
    this.CONSUME(tokens.ID);
  });

  public integerLiteralExpression = this.RULE("integerLiteralExpression", () => {
    this.CONSUME(tokens.IntegerLiteral);
  });

  // ------------------ utils ----------------------------------

  public typeSpecifier = this.RULE("typeSpecifier", () => {
    this.OR([{ ALT: () => this.CONSUME(tokens.IntType) }, { ALT: () => this.CONSUME(tokens.VoidType) }]);
  });
}

// run

export const parserInstance = new SimpleCParser();
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
