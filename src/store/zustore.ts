import { CstNode } from "chevrotain";
import produce from "immer";
import create from "zustand";
import { IBrilProgram } from "../languages/bril/BrilInterface";
import { ICFG } from "../languages/bril/cfgBuilder";
import { IAstProgram } from "../languages/simpleC/ast";

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
  set: (fn: (state: ParseState) => void) => void;
}

export const useParseStore = create<ParseState>()((set) => ({
  cst: { name: "root", children: {} },
  ast: { _name: "root", functionDeclarations: [] },
  bril: { functions: {} },
  brilOptim: { functions: {} },
  cfg: {},
  set: (fn: (state: ParseState) => void) => set(produce(fn)),
}));
