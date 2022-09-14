import * as monaco from "monaco-editor";
import { ISimpleCLangError } from "./DiagnosticsAdapter";
import SimpleCLanguageService from "./LanguageService";

export class SimpleCWorker {
  private _ctx;
  private languageService: SimpleCLanguageService;

  constructor(ctx: any) {
    this._ctx = ctx;
    this.languageService = new SimpleCLanguageService();
  }

  doValidation(): Promise<ISimpleCLangError[]> {
    const code = this.getTextDocument();
    return Promise.resolve(this.languageService.validate(code));
  }
  doFormat(code: string): Promise<string> {
    return Promise.resolve(this.languageService.format(code));
  }
  doSymbols(): Promise<any> {
    return Promise.resolve(this.languageService.symbols());
  }
  doSignatures(identifier: string, offset: number): Promise<monaco.languages.SignatureInformation[]> {
    return Promise.resolve(this.languageService.signatures(identifier, offset));
  }

  private getTextDocument(): string {
    const model = this._ctx.getMirrorModels()[0]; // When there are multiple files open, this will be an array
    return model.getValue();
  }
}
