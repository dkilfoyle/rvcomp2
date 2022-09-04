import { ISimpleCLangError } from "./DiagnosticsAdapter";
import { parse } from "../../../languages/simpleC/parser";
import { cstVisitor } from "../../../languages/simpleC/cstVisitor";

export default class SimpleCLanguageService {
  validate(code: string): ISimpleCLangError[] {
    // return parseAndGetSyntaxErrors(code);
    // console.log(parseAndGetASTRoot);
    const { cst, lexErrors, parseErrors } = parse(code);
    let ast;
    if (lexErrors.length == 0 && parseErrors.length == 0) ast = cstVisitor.program(cst.children);
    console.log(cst, ast);

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
    if (ast) errors.push(...ast.errors);
    return errors;
  }
  format(code: string): string {
    // if the code contains errors, no need to format, because this way of formating the code, will remove some of the code
    // to make things simple, we only allow formatting a valide code
    if (this.validate(code).length > 0) return code;
    let formattedCode = code;
    return formattedCode;
  }
}
