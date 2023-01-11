import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
import { VStack } from "@chakra-ui/react";
import { setupLanguage } from "./monaco/setup";

import { useSettingsStore, SettingsState, ParseState, useParseStore } from "../../store/zustore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { emitWasm } from "../../languages/wasm/brilToWasm";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Failed to load users:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

let decorations: monaco.editor.IEditorDecorationsCollection;

export const WasmEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  // const setParse = useParseStore((state: ParseState) => state.set);

  const wasmTxt = useMemo(() => {}, [brilOptim]);

  useEffect(() => {
    if (editor) {
      const wasmBuffer = emitWasm(brilOptim);
      // var blob = new Blob([wasmBuffer]); // change resultByte to bytes
      // var link = document.createElement("a");
      // link.href = window.URL.createObjectURL(blob);
      // link.download = "dean.wasm";
      // link.click();

      WabtModule().then((wabtModule) => {
        try {
          const wasmModule = wabtModule.readWasm(wasmBuffer, { readDebugNames: true });
          wasmModule.validate();
          wasmModule.generateNames();
          wasmModule.applyNames();
          const txt = wasmModule.toText({ foldExprs: true, inlineExport: true });
          const wasmModel = monaco.editor.createModel(txt, "wasm");
          editor.setModel(wasmModel);
        } catch (e) {
          const wasmModel = monaco.editor.createModel(e.toString());
          editor.setModel(wasmModel);
        }
      });
    }
  }, [brilOptim]);

  useEffect(() => {
    if (monacoEl && !editor) {
      setupLanguage();
      setEditor(monaco.editor.create(monacoEl.current!, { automaticLayout: true, language: "wasm" }));
    }
    return () => editor?.dispose();
  }, [monacoEl.current]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <VStack height="100%" align="left" spacing="0px">
        <div className={styles.Editor} ref={monacoEl}></div>
      </VStack>
    </ErrorBoundary>
  );
};
