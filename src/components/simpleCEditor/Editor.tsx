import { VFC, useRef, useState, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import { setupLanguage } from "./monaco/setup";
import code from "../../examples/helloint.sc?raw";

export const Editor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  useEffect(() => {
    if (monacoEl && !editor) {
      setupLanguage();
      setEditor(
        monaco.editor.create(monacoEl.current!, {
          value: code, //["void main() {", "\tint x;", "\tx=5;", "\tprint_int(x);", "}"].join("\n"),
          language: "simpleC",
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
