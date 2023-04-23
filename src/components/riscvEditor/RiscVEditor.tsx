import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
import { VStack } from "@chakra-ui/react";
import { setupLanguage } from "./monaco/setup";

import { useSettingsStore, SettingsState, ParseState, useParseStore } from "../../store/zustore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { riscvCodeGenerator } from "../../languages/riscv/brilToRV32";
import _ from "lodash";

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

export const RiscVEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  const { brilOptim, regAllo } = useParseStore((state: ParseState) => ({ brilOptim: state.brilOptim, regAllo: state.regAllo }));
  const setParse = useParseStore((state: ParseState) => state.set);

  useEffect(() => {
    if (editor && Object.keys(brilOptim.functions).length > 0) {
      try {
        const riscv = riscvCodeGenerator.generate(brilOptim, regAllo);
        console.log("RiscV code generation: ", riscv);
        const riscvModel = monaco.editor.createModel(riscv.asm, "riscv");
        editor.setModel(riscvModel);
        setParse((state) => {
          state.riscv = riscv;
        });
      } catch (e: any) {
        setParse((state) => {
          state.riscv = { asm: "", memWords: [], metas: new Map(), textStart: 0, dataStart: 0, heapStart: 0 };
        });
        const riscvModel = monaco.editor.createModel(e.toString());
        editor.setModel(riscvModel);
        console.info("RiscV code generation errors:");
        console.info(e.toString());
      }
    }
  }, [brilOptim]);

  useEffect(() => {
    if (!editor) {
      setupLanguage();
      setEditor(monaco.editor.create(document.getElementById("riscvEditorContainer")!, { automaticLayout: true, language: "riscv" }));
    }
    return () => editor?.dispose();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <VStack height="100%" align="left" spacing="0px">
        <div className={styles.Editor} id="riscvEditorContainer" ref={monacoEl}></div>
      </VStack>
    </ErrorBoundary>
  );
};
