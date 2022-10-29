import { VFC, useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import styles from "./Editor.module.css";
import "./index.css";
import { brilIR, brilTxt, selectedCfgNodeName, selectedFunctionName, cfg } from "../../store/ParseState";
import { brilPrinter } from "../../languages/bril/BrilPrinter";
// import code from "../../examples/semanticerrors.sc?raw";

let decorations: monaco.editor.IEditorDecorationsCollection;

export const BrilEditor: VFC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  const _brilTxt = brilTxt.use();
  const _brilIR = brilIR.use();
  const _cfg = cfg.use();
  const _selectedCfgNodeName = selectedCfgNodeName.use();
  const _selectedFunctionName = selectedFunctionName.use();

  const selectedCfgNode = useMemo(() => {
    const fn = _cfg.get(_selectedFunctionName);
    if (fn) {
      return fn.find((f) => f.name == _selectedCfgNodeName);
    } else return undefined;
  }, [_selectedCfgNodeName, _selectedFunctionName]);

  // const startNode = useMemo(() => {
  //   return _brilIR.functions.find((fn) => fn.name === _selectedFunctionName)?.instrs.find((ins) => ins.key == selectedCfgNode?.keyStart);
  // }, [selectedCfgNode?.keyStart, _selectedFunctionName]);

  useEffect(() => {
    if (selectedCfgNode && editor) {
      const startLine = (brilPrinter.irkeys[selectedCfgNode.keyStart] || -1) + 1;
      const endLine = (brilPrinter.irkeys[selectedCfgNode.keyEnd] || -1) + 1;

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
      editor.getModel()?.setValue(_brilTxt);
    }
  }, [_brilTxt]);

  useEffect(() => {
    if (monacoEl && !editor) {
      setEditor(
        monaco.editor.create(monacoEl.current!, {
          value: _brilTxt,
          language: "bril",
          automaticLayout: true,
        })
      );
    }
    return () => editor?.dispose();
  }, [monacoEl.current]);

  return <div className={styles.Editor} ref={monacoEl}></div>;
};
