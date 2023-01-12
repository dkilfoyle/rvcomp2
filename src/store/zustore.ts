import { CstNode } from "chevrotain";
import produce from "immer";
import create from "zustand";
import { IBrilProgram } from "../languages/bril/BrilInterface";
import { ICFG } from "../languages/bril/cfgBuilder";
import { IAstProgram } from "../languages/simpleC/ast";
import { ISimpleCLangError } from "../components/simpleCEditor/monaco/DiagnosticsAdapter";

export interface SettingsState {
  filename: string;
  cfg: {
    nodeName: string;
    functionName: string;
  };
  optim: {
    keepPhis: boolean;
    isSSA: boolean;
    doLVN: boolean;
    doGVN: boolean;
    doDCE: boolean;
  };
  bril: {
    keepPhis: boolean;
    isSSA: boolean;
  };
  interp: {
    isRunUnoptim: boolean;
    isRunOptim: boolean;
    isRunAuto: boolean;
  };
  set: (fn: (state: SettingsState) => void) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  filename: "./helloint.sc",
  cfg: {
    nodeName: "",
    functionName: "main",
  },
  optim: {
    keepPhis: true,
    isSSA: false,
    doLVN: false,
    doGVN: false,
    doDCE: false,
  },
  bril: {
    keepPhis: true,
    isSSA: false,
  },
  interp: {
    isRunUnoptim: true,
    isRunOptim: true,
    isRunAuto: true,
  },
  set: (fn: (state: SettingsState) => void) => set(produce(fn)),
}));

export interface ParseState {
  cst: CstNode;
  ast: IAstProgram;
  bril: IBrilProgram;
  brilOptim: IBrilProgram;
  cfg: ICFG;
  errors: ISimpleCLangError[];
  wasm: Uint8Array;
  set: (fn: (state: ParseState) => void) => void;
  reset: (rcst: boolean, rast?: boolean, rbril?: boolean, rbrilOptim?: boolean, rcfg?: boolean) => void;
}

export const useParseStore = create<ParseState>()((set) => ({
  cst: { name: "root", children: {} },
  ast: { _name: "root", functionDeclarations: [] },
  bril: { functions: {} },
  brilOptim: { functions: {} },
  cfg: {},
  errors: [],
  wasm: new Uint8Array(),
  set: (fn: (state: ParseState) => void) => set(produce(fn)),
  reset: (rcst: boolean, rast: boolean = true, rbril: boolean = true, rbrilOptim: boolean = true, rcfg: boolean = true) =>
    set(
      produce((state) => {
        if (rcst) state.cst = { name: "root", children: {} };
        if (rast) state.ast = { _name: "root", functionDeclarations: [] };
        if (rbril) state.bril = { functions: {} };
        if (rbrilOptim) state.brilOptim = { functions: {} };
        if (rcfg) state.cfg = {};
        state.wasm = [];
      })
    ),
}));
