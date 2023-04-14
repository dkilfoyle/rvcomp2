import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
import { brilPrinter } from "../../languages/bril/BrilPrinter";
import { VStack } from "@chakra-ui/react";
import { setupLanguage } from "./monaco/setup";

import { optimiseBril } from "../../languages/bril/BrilOptimiser";
import { useSettingsStore, SettingsState, ParseState, useParseStore } from "../../store/zustore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { registerAllocation } from "../../languages/bril/registers";

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

  const [cfgNodeName, cfgFunctionName] = useSettingsStore((state: SettingsState) => [state.cfg.nodeName, state.cfg.functionName]);
  const [brilIsSSA, brilRemovePhis] = useSettingsStore((state: SettingsState) => [state.bril.isSSA, state.bril.removePhis]);
  const optimisations = useSettingsStore((state: SettingsState) => state.optimisations.selected);

  const brilTxt = useMemo(() => {
    if (brilIsSSA) {
      const { optimBril, optimCfg } = optimiseBril(bril, ["SSA", "Phis-"]);

      return brilPrinter.print(optimBril);
    } else return brilPrinter.print(bril);
  }, [bril, brilIsSSA, brilRemovePhis]);

  useEffect(() => {
    const { optimBril, optimCfg } = optimiseBril(bril, optimisations, window.conout0); //, "doLICM", "removePhis", "doDCE"], true);
    // if (Object.keys(optimBril.functions).length) {
    //   const registers = registerAllocation(optimBril);
    //   console.log("Registers", registers);
    // }

    setParse((state: ParseState) => {
      state.brilOptim = optimBril;
    });
    setParse((state: ParseState) => {
      state.cfg = optimCfg;
    });
    // console.log(optimBril);
  }, [bril, optimisations]);

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
    if (!editor) {
      setupLanguage();
      setEditor(monaco.editor.createDiffEditor(document.getElementById("brilEditorContainer")!, { automaticLayout: true }));
    }
    return () => editor?.dispose();
  }, []);

  // useEffect(() => {
  //   if (monacoEl && !editor) {
  //     setupLanguage();
  //     setEditor(monaco.editor.createDiffEditor(monacoEl.current!, { automaticLayout: true }));
  //   }
  //   return () => editor?.dispose();
  // }, [monacoEl.current]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <VStack height="100%" align="left" spacing="0px">
        <div className={styles.Editor} id="brilEditorContainer" ref={monacoEl}></div>
      </VStack>
    </ErrorBoundary>
  );
};
