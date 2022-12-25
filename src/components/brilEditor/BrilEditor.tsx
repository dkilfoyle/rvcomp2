import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
import { brilPrinter } from "../../languages/bril/BrilPrinter";
import { VStack } from "@chakra-ui/react";
import { setupLanguage } from "./monaco/setup";

import { optimiseBril } from "../../languages/bril/BrilCompiler";
import { useSettingsStore, SettingsState, ParseState, useParseStore } from "../../store/zustore";
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

let decorations: monaco.editor.IEditorDecorationsCollection;

export const BrilEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoEl = useRef(null);

  const cfg = useParseStore((state: ParseState) => state.cfg);
  const bril = useParseStore((state: ParseState) => state.bril);
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const setParse = useParseStore((state: ParseState) => state.set);

  const cfgNodeName = useSettingsStore((state: SettingsState) => state.cfg.nodeName);
  const cfgFunctionName = useSettingsStore((state: SettingsState) => state.cfg.functionName);
  const keepPhis = useSettingsStore((state: SettingsState) => state.optim.keepPhis);
  const isSSA = useSettingsStore((state: SettingsState) => state.optim.isSSA);
  const brilKeepPhis = useSettingsStore((state: SettingsState) => state.bril.keepPhis);
  const brilIsSSA = useSettingsStore((state: SettingsState) => state.bril.isSSA);
  const doLVN = useSettingsStore((state: SettingsState) => state.optim.doLVN);
  const doGVN = useSettingsStore((state: SettingsState) => state.optim.doGVN);
  const doDCE = useSettingsStore((state: SettingsState) => state.optim.doDCE);

  const brilTxt = useMemo(() => {
    if (brilIsSSA) {
      const { optimBril, optimCfg } = optimiseBril(bril, brilIsSSA, keepPhis);
      return brilPrinter.print(optimBril);
    } else return brilPrinter.print(bril);
  }, [bril, brilIsSSA, brilKeepPhis]);

  useEffect(() => {
    const { optimBril, optimCfg } = optimiseBril(bril, isSSA, keepPhis, doLVN, doGVN, doDCE, true);
    setParse((state: ParseState) => {
      state.brilOptim = optimBril;
    });
    setParse((state: ParseState) => {
      state.cfg = optimCfg;
    });
  }, [bril, keepPhis, isSSA, doLVN, doGVN, doDCE]);

  const brilTxtOptim = useMemo(() => {
    return brilPrinter.print(brilOptim);
  }, [brilOptim]);

  const selectedCfgNode = useMemo(() => {
    const fn = cfg[cfgFunctionName];
    if (fn) {
      return fn.find((f) => f.name == cfgNodeName);
    } else return undefined;
  }, [cfgNodeName, cfgFunctionName]);

  // const startNode = useMemo(() => {
  //   return _brilIR.functions.find((fn) => fn.name === _selectedFunctionName)?.instrs.find((ins) => ins.key == selectedCfgNode?.keyStart);
  // }, [selectedCfgNode?.keyStart, _selectedFunctionName]);

  useEffect(() => {
    if (selectedCfgNode && editor) {
      const startLine = brilPrinter.irkeys[cfgFunctionName][selectedCfgNode.keyStart] + 1;
      const endLine = brilPrinter.irkeys[cfgFunctionName][selectedCfgNode.keyEnd] + 1;
      const newDecoration = {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: "rangeHighlight",
        },
      };

      if (!decorations) {
        decorations = editor.createDecorationsCollection([newDecoration]);
      } else {
        decorations.set([newDecoration]);
      }
    }
  }, [selectedCfgNode, cfgFunctionName]);

  useEffect(() => {
    if (editor) {
      const originalBril = monaco.editor.createModel(brilTxt);
      const optimBril = monaco.editor.createModel(brilTxtOptim);
      editor.setModel({ original: originalBril, modified: optimBril });
    }
  }, [brilTxt, brilTxtOptim]);

  useEffect(() => {
    if (monacoEl && !editor) {
      setupLanguage();
      setEditor(monaco.editor.createDiffEditor(monacoEl.current!, { automaticLayout: true }));
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
