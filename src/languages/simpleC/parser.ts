/**
 * A parser for the SimpleC programing language
 * https://tomassetti.me/ebnf/#examples (Scroll down a bit)
 */

import chevrotain, { CstParser, IToken, Rule, tokenMatcher } from "chevrotain";
import { tokens, allTokens } from "./tokens";
import { SimpleCLexer } from "./lexer";

// program:
//   functionDeclaration*
//   | statement*
// functionDeclaration:
//   typedIdentifier
//   '(' parameterList? ')'
//    block
// parameterList:
//   typedIdentifier (',' typedIdentifier)*
// typedIdtentifier: typeSpecifier ID
// typeSpecifier: (IntType | VoidType)
// variableDeclarationStatement
//   typedIdentifier ';'

// interface IAstNode {
//   name: string;
// }

// type IAstOperator = "+" | "-" | "*" | "/";

// interface IAstExpression extends IAstNode {
//   lhs: IAstExpression | IAstAtomic;
//   rhs: IAstExpression | IAstAtomic;
//   op: IAstOperator;
// }

// interface IAstAtomic {

// }

// ----------------- parser -----------------

// add to @chevrotain/types/api.d.ts in BaseParser
// consumeToken(): void
// cstPostTerminal(key: string, consumedToken: IToken): void

class SimpleCParser extends CstParser {
  constructor() {
    super(allTokens, { nodeLocationTracking: "full" });
    this.performSelfAnalysis();
  }

  LA(howMuch: number) {
    // Skip Comments during regular parsing as we wish to auto-magically insert them
    // into our CST
    while (tokenMatcher(super.LA(howMuch), tokens.LineComment)) {
      super.consumeToken();
    }

    return super.LA(howMuch);
  }

  cstPostTerminal(key: string, consumedToken: IToken) {
    super.cstPostTerminal(key, consumedToken);

    let lookBehindIdx = -1;
    let prevToken = super.LA(lookBehindIdx);

    // After every Token (terminal) is successfully consumed
    // We will add all the comment that appeared before it to the CST (Parse Tree)
    while (tokenMatcher(prevToken, tokens.LineComment)) {
      super.cstPostTerminal(tokens.LineComment.name, prevToken);
      lookBehindIdx--;
      prevToken = super.LA(lookBehindIdx);
    }
  }

  public program = this.RULE("program", () => {
    this.MANY(() => {
      this.SUBRULE(this.functionDeclaration);
    });
    // this.MANY2(() => {
    //   this.SUBRULE(this.statement);
    // });
  });

  public functionDeclaration = this.RULE("functionDeclaration", () => {
    this.OPTION(() => {
      this.CONSUME(tokens.DocComment);
    });
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(tokens.LParen);
    this.OPTION2(() => {
      this.SUBRULE(this.variableDeclarationList, { LABEL: "params" });
    });
    this.CONSUME(tokens.RParen);
    this.SUBRULE(this.blockStatement);
  });

  public variableDeclarationList = this.RULE("variableDeclarationList", () => {
    this.AT_LEAST_ONE_SEP({
      SEP: tokens.Comma,
      DEF: () => {
        this.SUBRULE(this.variableDeclaration);
      },
    });
  });

  public variableDeclaration = this.RULE("variableDeclaration", () => {
    this.SUBRULE(this.typeSpecifier);
    this.OPTION(() => {
      this.CONSUME(tokens.LSquare);
      this.SUBRULE2(this.integerLiteralExpression, { LABEL: "arraySize" });
      this.CONSUME(tokens.RSquare);
    });

    this.CONSUME(tokens.ID);
    this.OPTION2(() => {
      this.CONSUME(tokens.Equals);
      this.SUBRULE(this.additionExpression);
    });
  });

  // ==========================================================================================================
  // Statements
  // ==========================================================================================================

  public statement = this.RULE("statement", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.forStatement) },
      { ALT: () => this.SUBRULE(this.whileStatement) },
      { ALT: () => this.SUBRULE(this.blockStatement) },
      { ALT: () => this.SUBRULE(this.variableDeclarationStatement) },
      { ALT: () => this.SUBRULE(this.assignStatement) },
      { ALT: () => this.SUBRULE(this.functionCallStatement) },
      { ALT: () => this.SUBRULE(this.returnStatement) },
    ]);
  });

  public ifStatement = this.RULE("ifStatement", () => {
    this.CONSUME(tokens.If);
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.additionExpression, { LABEL: "testExpression" });
    this.CONSUME(tokens.RParen);
    this.SUBRULE(this.statement, { LABEL: "thenStatement" });
    this.OPTION(() => {
      this.CONSUME(tokens.Else);
      this.SUBRULE2(this.statement, { LABEL: "elseStatement" });
    });
  });

  public whileStatement = this.RULE("whileStatement", () => {
    this.CONSUME(tokens.While);
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.comparisonExpression);
    this.CONSUME(tokens.RParen);
    this.SUBRULE(this.statement);
  });

  public forStatement = this.RULE("forStatement", () => {
    this.CONSUME(tokens.For);
    this.CONSUME(tokens.LParen);
    // int i = 0; i = 0;
    this.SUBRULE(this.statement, { LABEL: "initStatement" });
    // i < 10;
    this.SUBRULE(this.comparisonExpression, { LABEL: "test" });
    this.CONSUME(tokens.SemiColon);
    // i = i + 1;
    this.SUBRULE2(this.statement, { LABEL: "stepStatement" });
    this.CONSUME(tokens.RParen);
    this.SUBRULE3(this.statement, { LABEL: "loopStatement" });
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

  // public expressionStatement = this.RULE("expressionStatement", () => {
  //   this.SUBRULE(this.additionExpression);
  //   this.CONSUME(tokens.SemiColon);
  // });

  public functionCallStatement = this.RULE("functionCallStatement", () => {
    this.SUBRULE(this.functionCallExpression);
    this.CONSUME(tokens.SemiColon);
  });

  public returnStatement = this.RULE("returnStatement", () => {
    this.CONSUME(tokens.Return);
    this.OPTION(() => {
      this.SUBRULE(this.additionExpression);
    });
    this.CONSUME(tokens.SemiColon);
  });

  public assignStatement = this.RULE("assignStatement", () => {
    this.SUBRULE(this.identifierExpression);
    this.CONSUME(tokens.Equals);
    this.SUBRULE(this.additionExpression);
    this.CONSUME(tokens.SemiColon);
  });

  // ==========================================================================================================
  // Expressions
  // ==========================================================================================================

  public additionExpression = this.RULE("additionExpression", () => {
    this.SUBRULE(this.comparisonExpression, { LABEL: "operands" });
    this.MANY(() => {
      this.CONSUME(tokens.AdditionOperator, { LABEL: "operators" });
      this.SUBRULE2(this.comparisonExpression, { LABEL: "operands" });
    });
  });

  public comparisonExpression = this.RULE("comparisonExpression", () => {
    this.SUBRULE(this.multiplicationExpression, { LABEL: "operands" });
    this.OPTION(() => {
      this.CONSUME(tokens.ComparisonOperator, { LABEL: "operators" });
      this.SUBRULE2(this.multiplicationExpression, { LABEL: "operands" });
    });
  });

  public multiplicationExpression = this.RULE("multiplicationExpression", () => {
    this.SUBRULE(this.atomicExpression, { LABEL: "operands" });
    this.MANY(() => {
      this.CONSUME(tokens.MultiplicationOperator, { LABEL: "operators" });
      this.SUBRULE2(this.atomicExpression, { LABEL: "operands" });
    });
  });

  public atomicExpression = this.RULE("atomicExpression", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.unaryExpression) },
      { GATE: this.BACKTRACK(this.functionCallExpression), ALT: () => this.SUBRULE(this.functionCallExpression) },
      { ALT: () => this.SUBRULE(this.identifierExpression) },
      { ALT: () => this.SUBRULE(this.literalExpression) },
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
    this.CONSUME(tokens.ID);
    // this.SUBRULE(this.identifierExpression);
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
    this.OPTION(() => {
      this.CONSUME(tokens.LSquare);
      this.SUBRULE2(this.integerLiteralExpression, { LABEL: "arrayIndex" });
      this.CONSUME(tokens.RSquare);
    });
  });

  public literalExpression = this.RULE("literalExpression", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.integerLiteralExpression) },
      { ALT: () => this.SUBRULE(this.floatLiteralExpression) },
      { ALT: () => this.SUBRULE(this.stringLiteralExpression) },
      { ALT: () => this.SUBRULE(this.boolLiteralExpression) },
      { ALT: () => this.SUBRULE(this.arrayLiteralExpression) },
    ]);
  });

  public integerLiteralExpression = this.RULE("integerLiteralExpression", () => {
    this.CONSUME(tokens.IntegerLiteral);
  });

  public floatLiteralExpression = this.RULE("floatLiteralExpression", () => {
    this.CONSUME(tokens.FloatLiteral);
  });

  public stringLiteralExpression = this.RULE("stringLiteralExpression", () => {
    this.CONSUME(tokens.StringLiteral);
  });

  public boolLiteralExpression = this.RULE("boolLiteralExpression", () => {
    this.OR([{ ALT: () => this.CONSUME(tokens.True) }, { ALT: () => this.CONSUME(tokens.False) }]);
  });

  public arrayLiteralExpression = this.RULE("arrayLiteralExpression", () => {
    this.CONSUME(tokens.LSquare);
    this.AT_LEAST_ONE_SEP({
      SEP: tokens.Comma,
      DEF: () => this.SUBRULE(this.additionExpression),
    });
    this.CONSUME(tokens.RSquare);
  });

  // ------------------ utils ----------------------------------

  public typeSpecifier = this.RULE("typeSpecifier", () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Int) },
      { ALT: () => this.CONSUME(tokens.Float) },
      { ALT: () => this.CONSUME(tokens.Void) },
      { ALT: () => this.CONSUME(tokens.String) },
      { ALT: () => this.CONSUME(tokens.Bool) },
    ]);
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
