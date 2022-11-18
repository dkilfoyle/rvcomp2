import { VFC, useRef, useState, useEffect, useMemo } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import { setupLanguage } from "./monaco/setup";
import { examples } from "../../examples/examples";
// import * as Settings from "../../store/Settings";
import type { RootState } from "../../store/store";
import { useSelector, useDispatch } from "react-redux";

// import code from "../../examples/semanticerrors.sc?raw";

export const Editor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  // const filename = Settings.filename.use();
  const filename = useSelector((state: RootState) => state.settings.filename);

  useEffect(() => {
    if (editor) {
      editor.getModel()?.setValue(examples[filename.split(".")[0]]);
    }
  }, [filename]);

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
      monaco.editor.onDidChangeMarkers(([uri]) => {
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        console.log(
          "markers: ",
          markers.map((m) => `${m.message} ${m.startLineNumber} ${m.startColumn}`)
        );
      });
    }
    return () => editor?.dispose();
  }, [monacoEl.current]);

  return <div className={styles.Editor} ref={monacoEl}></div>;
};
