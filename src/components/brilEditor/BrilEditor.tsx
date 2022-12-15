import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
// import { brilIR, brilTxt, selectedCfgNodeName, selectedFunctionName, cfg } from "../../store/ParseState";
import { brilPrinter } from "../../languages/bril/BrilPrinter";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { VStack } from "@chakra-ui/react";
import { setupLanguage } from "./monaco/setup";
// import { setBrilOptim } from "../../store/parseSlice";
// import { useAppDispatch } from "../../store/hooks";

import {
  selectBrilIsSSA,
  selectBrilKeepPhis,
  selectDoDCE,
  selectDoLVN,
  selectIsSSA,
  selectKeepPhis,
  setBrilIsSSA,
} from "../../store/settingsSlice";
import { optimiseBril } from "../../languages/bril/BrilCompiler";
// import code from "../../examples/semanticerrors.sc?raw";

let decorations: monaco.editor.IEditorDecorationsCollection;

export const BrilEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoEl = useRef(null);

  // const _brilTxt = brilTxt.use();
  // const _brilIR = brilIR.use();
  // const _cfg = cfg.use();
  // const _selectedCfgNodeName = selectedCfgNodeName.use();
  // const _selectedFunctionName = selectedFunctionName.use();

  const cfg = useSelector((state: RootState) => state.parse.cfg);
  const bril = useSelector((state: RootState) => state.parse.bril);
  const cfgNodeName = useSelector((state: RootState) => state.settings.cfg.nodeName);
  const cfgFunctionName = useSelector((state: RootState) => state.settings.cfg.functionName);

  const keepPhis = useSelector(selectKeepPhis);
  const isSSA = useSelector(selectIsSSA);
  const brilKeepPhis = useSelector(selectBrilKeepPhis);
  const brilIsSSA = useSelector(selectBrilIsSSA);
  const doLVN = useSelector(selectDoLVN);
  const doDCE = useSelector(selectDoDCE);

  const brilTxt = useMemo(() => {
    if (brilIsSSA) {
      const brilOptim = optimiseBril(bril, brilIsSSA, keepPhis);
      return brilPrinter.print(brilOptim);
    } else return brilPrinter.print(bril);
  }, [bril, brilIsSSA, brilKeepPhis]);

  const brilTxtOptim = useMemo(() => {
    const brilOptim = optimiseBril(bril, isSSA, keepPhis, doLVN, doDCE);
    return brilPrinter.print(brilOptim);
  }, [bril, keepPhis, isSSA, doLVN, doDCE]);

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
      const startLine = brilPrinter.irkeys.findIndex((x) => x == selectedCfgNode.keyStart) + 1;
      const endLine = brilPrinter.irkeys.findIndex((x) => x == selectedCfgNode.keyEnd) + 1;

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
  }, [selectedCfgNode]);

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
    <VStack height="100%" align="left" spacing="0px">
      <div className={styles.Editor} ref={monacoEl}></div>
    </VStack>
  );
};
