import { VFC, useRef, useState, useEffect, useMemo } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import { brilCodeEntity } from "../../store/ParseState";

// import code from "../../examples/semanticerrors.sc?raw";

export const BrilEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  const brilCode = brilCodeEntity.use();

  useEffect(() => {
    if (editor) {
      editor.getModel()?.setValue(brilCode);
    }
  }, [brilCode]);

  useEffect(() => {
    if (monacoEl && !editor) {
      setEditor(
        monaco.editor.create(monacoEl.current!, {
          value: brilCode,
          language: "bril",
          automaticLayout: true,
        })
      );
    }

    return () => editor?.dispose();
  }, [monacoEl.current]);

  return <div className={styles.Editor} ref={monacoEl}></div>;
};
