import * as monaco from "monaco-editor";
import { WorkerAccessor } from "./setup";
import { languageID } from "./config";

export interface ISimpleCLangError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  code: string;
}

export default class DiagnosticsAdapter {
  constructor(private worker: WorkerAccessor) {
    const onModelAdd = (model: monaco.editor.IModel): void => {
      let handle: any;
      model.onDidChangeContent(() => {
        // here we are Debouncing the user changes, so everytime a new change is done, we wait 500ms before validating
        // otherwise if the user is still typing, we cancel the
        clearTimeout(handle);
        handle = setTimeout(() => this.validate(model.uri), 500);
      });
      this.validate(model.uri);
    };
    monaco.editor.onDidCreateModel(onModelAdd);
    monaco.editor.getModels().forEach(onModelAdd);
  }
  private async validate(resource: monaco.Uri): Promise<void> {
    console.log("this.validate");
    // get the worker proxy
    const worker = await this.worker(resource);
    // call the validate methode proxy from the langaueg service and get errors
    const errorMarkers = await worker.doValidation();
    // get the current model(editor or file) which is only one
    const model = monaco.editor.getModel(resource);
    // add the error markers and underline them with severity of Error
    if (model) monaco.editor.setModelMarkers(model, languageID, errorMarkers.map(toDiagnostics));
  }
}
function toDiagnostics(error: ISimpleCLangError): monaco.editor.IMarkerData {
  return {
    ...error,
    severity: monaco.MarkerSeverity.Error,
  };
}
