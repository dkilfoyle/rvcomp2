import chevrotain from "chevrotain";
import { allTokens } from "./tokens";

const Lexer = chevrotain.Lexer;

export const SimpleCLexer = new Lexer(allTokens, { ensureOptimizations: true });
