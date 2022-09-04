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
  format(code: string): Promise<string> {
    return Promise.resolve(this.languageService.format(code));
  }
  private getTextDocument(): string {
    const model = this._ctx.getMirrorModels()[0]; // When there are multiple files open, this will be an array
    return model.getValue();
  }
}
