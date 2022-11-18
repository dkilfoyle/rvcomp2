import * as monaco from "monaco-editor";
import { Adapter } from "./Adapter";

const _LParen = "(".charCodeAt(0);
const _RParen = ")".charCodeAt(0);
const _LCurly = "{".charCodeAt(0);
const _RCurly = "}".charCodeAt(0);
const _LBracket = "[".charCodeAt(0);
const _RBracket = "]".charCodeAt(0);
const _Comma = ",".charCodeAt(0);
const _SQuote = "'".charCodeAt(0);
const _DQuote = '"'.charCodeAt(0);
const _a = "a".charCodeAt(0);
const _z = "z".charCodeAt(0);
const _A = "A".charCodeAt(0);
const _Z = "Z".charCodeAt(0);
const _USC = "_".charCodeAt(0);
const _NL = "\n".charCodeAt(0);
const _WSB = " ".charCodeAt(0);
const _TAB = "\t".charCodeAt(0);

class BackwardIterator {
  line: string;
  constructor(public model: monaco.editor.ITextModel, public offset: number, public lineNumber: number) {
    this.line = model.getLineContent(lineNumber).substring(0, offset);
  }
  hasNext() {
    return this.lineNumber >= 0;
  }
  next() {
    if (this.offset < 0) {
      if (this.lineNumber > 0) {
        this.lineNumber--;
        this.line = this.model.getLineContent(this.lineNumber + 1);
        this.offset = this.line.length - 1;
        return _NL;
      }
      this.lineNumber = -1;
      return 0;
    }
    let ch = this.line.charCodeAt(this.offset);
    this.offset--;
    return ch;
  }
}

export default class SimpleCSignatureHelpProvider extends Adapter implements monaco.languages.SignatureHelpProvider {
  public signatureHelpTriggerCharacters = ["(", ","];

  async provideSignatureHelp(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken,
    context: monaco.languages.SignatureHelpContext
  ): Promise<monaco.languages.SignatureHelpResult | null | undefined> {
    // get the worker proxy
    const resource = model.uri;
    const worker = await this.worker(resource);

    let iterator = new BackwardIterator(model, position.column - 1, position.lineNumber);
    const activeParameter = this.readArguments(iterator);
    if (activeParameter < 0) return null;

    let ident = this.readIdentifer(iterator);
    if (!ident) return null;

    // get document symbols from the worker
    const signatures = await worker.doSignatures(ident, model.getOffsetAt(position));

    const result = {
      dispose: () => {},
      value: {
        activeParameter,
        activeSignature: 0,
        signatures,
      },
    };
    console.log(result);
    return result;
  }

  readArguments(iterator: BackwardIterator) {
    let parenNesting = 0;
    let curlyNesting = 0;
    let bracketNesting = 0;
    let paramCount = 0;
    while (iterator.hasNext()) {
      let ch = iterator.next();
      switch (ch) {
        case _LParen:
          parenNesting--;
          if (parenNesting < 0) return paramCount;
          break;
        case _RParen:
          parenNesting++;
          break;
        case _LCurly:
          curlyNesting--;
          break;
        case _RCurly:
          curlyNesting++;
          break;
        case _LBracket:
          bracketNesting--;
          break;
        case _RBracket:
          bracketNesting++;
          break;
        case _DQuote:
        case _SQuote:
          while (iterator.hasNext() && ch !== iterator.next()) {}
          break;
        case _Comma:
          if (!parenNesting && !bracketNesting && !curlyNesting) paramCount++;
          break;
      }
    }
    return -1;
  }

  readIdentifer(iterator: BackwardIterator) {
    const isIdentiferPart = (ch: number) => {
      return ch === _USC || (ch >= _a && ch <= _z) || (ch >= _A && ch <= _Z) || (ch >= 0x80 && ch <= 0xffff);
    };

    let identStarted = false;
    let ident = "";
    while (iterator.hasNext()) {
      let ch = iterator.next();
      if (!identStarted && (ch === _WSB || ch === _TAB || ch === _NL)) continue; // consume whitespace
      if (isIdentiferPart(ch)) {
        identStarted = true;
        ident = String.fromCharCode(ch) + ident;
      } else if (identStarted) return ident;
    }
  }
}
