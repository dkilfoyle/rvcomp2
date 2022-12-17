import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import { setupLanguage } from "./monaco/setup";
import { examples } from "../../examples/examples";
// import * as Settings from "../../store/Settings";
import type { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { setCfgFunctionName } from "../../store/settingsSlice";
import { useAppDispatch } from "../../store/hooks";

// import code from "../../examples/semanticerrors.sc?raw";

export const Editor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  // const filename = Settings.filename.use();
  const filename = useSelector((state: RootState) => state.settings.filename);
  const cst = useSelector((state: RootState) => state.parse.cst);
  const ast = useSelector((state: RootState) => state.parse.ast);
  const dispatch = useAppDispatch();

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
        if (foundDeclaration) dispatch(setCfgFunctionName(foundDeclaration?.id));
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

  return <div className={styles.Editor} ref={monacoEl}></div>;
};
