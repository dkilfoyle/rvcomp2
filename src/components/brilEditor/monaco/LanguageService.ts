import { ISimpleCLangError } from "./DiagnosticsAdapter";
import { parse } from "../../../languages/simpleC/parser";
import { cstVisitor } from "../../../languages/simpleC/cstToAstVisitor";
import * as monaco from "monaco-editor";
import { SimpleCLexer } from "../../../languages/simpleC/lexer";
import { tokenMatcher } from "chevrotain";
import { tokens } from "../../../languages/simpleC/tokens";
import { parserInstance } from "../../../languages/simpleC/parser";
import { convertDocCommentToSuggestionString, IAstFunctionDeclaration } from "../../../languages/simpleC/ast";

export default class SimpleCLanguageService {
  validate(code: string): { errors: ISimpleCLangError[]; cst: any; ast: any } {
    // return parseAndGetSyntaxErrors(code);
    // console.log(parseAndGetASTRoot);
    const { cst, lexErrors, parseErrors } = parse(code);
    const errors = [
      ...parseErrors.map((e) => ({
        message: e.message,
        code: "2",
        startColumn: e.token.startColumn as number,
        endColumn: e.token.endColumn as number,
        startLineNumber: e.token.startLine as number,
        endLineNumber: e.token.endLine as number,
      })),
      ...lexErrors.map((e) => ({
        message: e.message,
        code: "1",
        startColumn: e.column as number,
        endColumn: (e.column as number) + e.length,
        startLineNumber: e.line || 0,
        endLineNumber: e.line || 0,
      })),
    ];

    if (lexErrors.length == 0 && parseErrors.length == 0) {
      const astResult = cstVisitor.go(cst);
      errors.push(...astResult.errors);
      return { errors, cst, ast: astResult.ast };
    } else {
      return { errors, cst, ast: undefined };
    }
  }

  format(code: string): string {
    // if the code contains errors, no need to format, because this way of formating the code, will remove some of the code
    // to make things simple, we only allow formatting a valide code
    if (this.validate(code).errors.length > 0) return code;
    let formattedCode = code;
    return formattedCode;
  }

  symbols(): monaco.languages.DocumentSymbol[] {
    // todo: containerName and children
    return cstVisitor.scopeStack.flattenDown().map((sig) => {
      const pos = sig.pos || { startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 };
      return {
        range: pos,
        name: sig.id,
        kind: sig._name == "functionDeclaration" ? 11 : 12,
        detail: "",
        tags: [],
        selectionRange: pos,
      };
    });
  }

  signatures(identifier: string, offset: number): monaco.languages.SignatureInformation[] {
    // todo: parse code up to pos, return cstVisitor.scopeStack.getSignature(identifier)
    let sig = cstVisitor.scopeStack.getSignatureAtLocation(identifier, offset);
    if (!sig) return [];
    const sig2 = sig as IAstFunctionDeclaration;

    return [
      {
        label: `${sig2.id}(${sig2.params.map((p) => p.id).join(",")})`,
        parameters: sig2.params.map((p) => ({ label: p.id, documentation: p.type })),
      },
    ];
  }

  completions(code: string, offset: number, range: monaco.IRange): monaco.languages.CompletionItem[] {
    const lexResult = SimpleCLexer.tokenize(code);
    if (lexResult.errors.length > 0) {
      throw new Error("sad sad panda, lexing errors detected");
    }

    const lastInputToken = lexResult.tokens[lexResult.tokens.length - 1]; //_.last(lexResult.tokens)
    let partialSuggestionMode = false;
    let assistanceTokenVector = lexResult.tokens;

    // we have requested assistance while inside a Keyword or Identifier
    if (
      lastInputToken !== undefined &&
      (tokenMatcher(lastInputToken, tokens.ID) || tokenMatcher(lastInputToken, tokens.Keyword)) &&
      /\w/.test(code[code.length - 1])
    ) {
      assistanceTokenVector = assistanceTokenVector.slice(0, assistanceTokenVector.length - 1); //_.dropRight(assistanceTokenVector)
      partialSuggestionMode = true;
    }

    const syntacticSuggestions = parserInstance.computeContentAssist("program", assistanceTokenVector);

    let finalSuggestions: monaco.languages.CompletionItem[] = [];

    for (let i = 0; i < syntacticSuggestions.length; i++) {
      const currSyntaxSuggestion = syntacticSuggestions[i];
      const currTokenType = currSyntaxSuggestion.nextTokenType;
      const currRuleStack = currSyntaxSuggestion.ruleStack;
      const lastRuleName = currRuleStack[currRuleStack.length - 1]; //_.last(currRuleStack)

      // easy case where a keyword is suggested.
      if (tokens.Keyword.categoryMatchesMap![currTokenType.tokenTypeIdx!]) {
        finalSuggestions.push({
          label: (currTokenType.PATTERN! as RegExp).source,
          kind: 2,
          insertText: (currTokenType.PATTERN! as RegExp).source,
          range,
        });
      } else if (currTokenType === tokens.ID) {
        // in declarations, should not provide content assist for new symbols (Identifiers)
        if (lastRuleName == "functionDeclaration") {
          // NO-OP
        } else if (["functionCallExpression", "identifierExpression"].includes(lastRuleName)) {
          const scope = cstVisitor.scopeStack.getScopeAtLocation(offset);
          if (!scope) throw new Error();
          const symbols = cstVisitor.scopeStack.flattenUp(scope).map((sig) => ({
            label: sig.id,
            insertText: sig.id,
            range,
            kind: 1,
            documentation: { value: convertDocCommentToSuggestionString(sig.docComment) },
          }));
          symbols.forEach((sym) => {
            if (!finalSuggestions.find((suggestion: monaco.languages.CompletionItem) => suggestion.label === sym.label)) {
              finalSuggestions.push(sym);
            }
          });
        } else {
          // throw Error("non exhaustive match");
        }
      } else {
        // throw Error("non exhaustive match");
      }
    }

    return finalSuggestions;

    // const result: monaco.languages.CompletionItem[] = [
    //   {
    //     label: "print_int",
    //     kind: 1,
    //     insertText: "print_int",
    //     range,
    //     documentation: "Print integer argument to console",
    //     detail: "(function) void print_int(int num)",
    //   },
    // ];
  }
}
