import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import { setupLanguage } from "./monaco/setup";
import { examples } from "../../examples/examples";
import { ParseState, SettingsState, useParseStore, useSettingsStore } from "../../store/zustore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Failed to load users:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export const Editor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  const filename = useSettingsStore((state: SettingsState) => state.filename);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  // const cst = useParseStore((state: ParseState) => state.cst);
  const ast = useParseStore((state: ParseState) => state.ast);

  useEffect(() => {
    if (editor) {
      editor.getModel()?.setValue(examples[filename.split(".")[0]]);
    }
  }, [filename]);

  // const onCursorPositionChanged = useCallback(
  //   (e: monaco.editor.ICursorPositionChangedEvent) => {
  //     const curLine = e.position.lineNumber;
  //     console.log(curLine, cst, ast);
  //     const foundDeclaration = ast.functionDeclarations.find(
  //       (decl) => curLine >= (decl.pos?.startLineNumber || 10000) && curLine <= (decl.pos?.endLineNumber || 0)
  //     );
  //     if (foundDeclaration) dispatch(setCfgFunctionName(foundDeclaration?.id));
  //   },
  //   [ast]
  // );

  useEffect(() => {
    if (editor)
      monaco.editor.getEditors()[0].onDidChangeCursorPosition((e) => {
        const curLine = e.position.lineNumber;
        const foundDeclaration = ast.functionDeclarations.find(
          (decl) => curLine >= (decl.pos?.startLineNumber || 10000) && curLine <= (decl.pos?.endLineNumber || 0)
        );
        if (foundDeclaration)
          setSettings((state: SettingsState) => {
            state.cfg.functionName = foundDeclaration.id;
          });
        // dispatch(setCfgFunctionName(foundDeclaration?.id));
      });
  }, [ast]);

  useEffect(() => {
    if (monacoEl && !editor) {
      setupLanguage();
      setEditor(
        monaco.editor.create(monacoEl.current!, {
          value: examples[filename.split(".")[0]], //["void main() {", "\tint x;", "\tx=5;", "\tprint_int(x);", "}"].join("\n"),
          language: "simpleC",
          automaticLayout: true,
        })
      );
      // monaco.editor.onDidChangeMarkers(([uri]) => {
      //   const markers = monaco.editor.getModelMarkers({ resource: uri });
      //   console.log(
      //     "markers: ",
      //     markers.map((m) => `${m.message} ${m.startLineNumber} ${m.startColumn}`)
      //   );
      // });
      // monaco.editor.getEditors()[0].onDidChangeCursorPosition(onCursorPositionChanged);
    }
    return () => editor?.dispose();
  }, [monacoEl.current]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className={styles.Editor} ref={monacoEl}></div>
    </ErrorBoundary>
  );
};
