import * as monaco from "monaco-editor";
import { WorkerAccessor } from "./setup";
import { languageID } from "./config";
// import { setCst, setAst, setBril, setCfg } from "../../../store/ParseState";
import { CstNode } from "chevrotain";
import { astToBrilVisitor } from "../../../languages/bril/astToBrilVisitor";
import { IAstProgram, IAstResult } from "../../../languages/simpleC/ast";
import { ParseState, useParseStore } from "../../../store/zustore";
import { IBrilProgram } from "../../../languages/bril/BrilInterface";
import _ from "lodash";
import { cfgBuilder, validateCfg } from "../../../languages/bril/cfg";

export interface ISimpleCLangError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  code: string;
}

export interface IValidationResult {
  errors: ISimpleCLangError[];
  cst?: CstNode;
  ast?: IAstProgram; //Record<string, unknown>;
}

export default class DiagnosticsAdapter {
  constructor(private worker: WorkerAccessor) {
    const onModelAdd = (model: monaco.editor.IModel): void => {
      if (model.getLanguageId() == "simpleC") {
        let handle: any;
        model.onDidChangeContent(() => {
          // here we are Debouncing the user changes, so everytime a new change is done, we wait 500ms before validating
          // otherwise if the user is still typing, we cancel the
          clearTimeout(handle);
          handle = setTimeout(() => {
            this.validate(model.uri);
            // console.log("CST:", cst);
          }, 500);
        });
        this.validate(model.uri);
      }
    };
    monaco.editor.onDidCreateModel(onModelAdd);
    monaco.editor.getModels().forEach(onModelAdd);
  }
  private async validate(resource: monaco.Uri): Promise<void> {
    // get the worker proxy
    const worker = await this.worker(resource);
    // call the validate methode proxy from the langaueg service and get errors
    const { errors, cst, ast } = await worker.doValidation();

    const setParse = useParseStore.getState().set;
    const resetParse = useParseStore.getState().reset;

    setParse((state: ParseState) => {
      state.errors = errors;
    });

    if (errors.length > 0) {
      console.info("Parse errors:");
      errors.forEach((err, i) => {
        console.info(i + ": " + err.message);
      });
    }

    let bril: IBrilProgram;

    if (cst)
      setParse((state: ParseState) => {
        state.cst = cst;
      });
    else {
      // parse errors
      resetParse(true);
    }
    if (ast) {
      setParse((state: ParseState) => {
        state.ast = ast;
      });
      if (errors.length == 0) {
        bril = astToBrilVisitor.visit(ast);
        // const cfg = cfgBuilder.buildProgram(bril);
        // validateCfg(cfg, errors);
        // if (errors.length == 0)
        setParse((state: ParseState) => {
          state.bril = bril;
          // state.brilCfg = cfg;
        });
      }
    }

    resetParse(_.isUndefined(cst), _.isUndefined(ast), errors.length > 0, errors.length > 0);

    // get the current model(editor or file) which is only one
    const model = monaco.editor.getModel(resource);
    // add the error markers and underline them with severity of Error
    if (model) monaco.editor.setModelMarkers(model, languageID, errors.map(toDiagnostics));
  }
}
function toDiagnostics(error: ISimpleCLangError): monaco.editor.IMarkerData {
  return {
    ...error,
    severity: monaco.MarkerSeverity.Error,
  };
}
