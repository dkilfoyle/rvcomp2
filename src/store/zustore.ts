import { CstNode } from "chevrotain";
import produce from "immer";
import { create } from "zustand";
import { IBrilProgram } from "../languages/bril/BrilInterface";
import { ICFG } from "../languages/bril/cfg";
import { IAstProgram } from "../languages/simpleC/ast";
import { ISimpleCLangError } from "../components/simpleCEditor/monaco/DiagnosticsAdapter";
import { IRegisterAllocation } from "../languages/bril/registers";

export interface SettingsState {
  filename: string;
  cfg: {
    nodeName: string;
    functionName: string;
  };
  optimisations: {
    selected: string[];
    available: string[];
  };
  // optim: {
  //   removePhis: boolean;
  //   isSSA: boolean;
  //   doLVN: boolean;
  //   doGVN: boolean;
  //   doDCE: boolean;
  //   doLICM: boolean;
  // };
  bril: {
    removePhis: boolean;
    isSSA: boolean;
  };
  wasm: {
    foldExprs: boolean;
  };
  interp: {
    isRunUnoptim: boolean;
    isRunOptim: boolean;
    isRunWasm: boolean;
    isRunAuto: boolean;
    mainName: string;
    mainArgs: string;
    loopName: string;
    loopDelay: number;
    loopTimes: number;
    doRun: number;
  };
  set: (fn: (state: SettingsState) => void) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  // filename: "./Screen/setpixel.sc",
  // filename: "./Syntax/while.sc",
  // filename: "./Screen/mandel.sc",
  // filename: "./Syntax/elseif.sc",
  filename: "./CodeGen/regsimple.sc",
  cfg: {
    nodeName: "",
    functionName: "main",
  },
  optimisations: {
    // selected: ["LICM", "SSA", "Phis-", "DCE"],
    selected: [],
    available: ["LICM&SR", "LVN", "GVN", "DCE", "Unroll", "SSA", "Phis-"],
  },
  // optim: {
  //   removePhis: true,
  //   isSSA: true,
  //   doLVN: false,
  //   doGVN: true,
  //   doDCE: true,
  //   doLICM: true,
  // },
  bril: {
    removePhis: false,
    isSSA: false,
  },
  wasm: {
    foldExprs: true,
  },
  interp: {
    isRunUnoptim: false,
    isRunOptim: true,
    isRunWasm: false,
    isRunAuto: true,
    mainName: "main",
    mainArgs: "",
    loopName: "frame",
    loopDelay: 200,
    loopTimes: 200,
    doRun: 0,
  },
  set: (fn: (state: SettingsState) => void) => set(produce(fn)),
}));

export interface ParseState {
  cst: CstNode;
  ast: IAstProgram;
  bril: IBrilProgram;
  brilOptim: IBrilProgram;
  regAllo: IRegisterAllocation;
  cfg: ICFG;
  errors: ISimpleCLangError[];
  wasm: Uint8Array;
  riscv: string;
  set: (fn: (state: ParseState) => void) => void;
  reset: (rcst: boolean, rast?: boolean, rbril?: boolean, rbrilOptim?: boolean, rcfg?: boolean) => void;
}

export const useParseStore = create<ParseState>()((set) => ({
  cst: { name: "root", children: {} },
  ast: { _name: "root", functionDeclarations: [] },
  bril: { functions: {}, data: new Map(), dataSize: 0 },
  brilOptim: { functions: {}, data: new Map(), dataSize: 0 },
  cfg: {},
  regAllo: { graph: {}, coloring: {} },
  errors: [],
  wasm: new Uint8Array(),
  riscv: "",
  set: (fn: (state: ParseState) => void) => set(produce(fn)),
  reset: (rcst: boolean, rast: boolean = true, rbril: boolean = true, rbrilOptim: boolean = true, rcfg: boolean = true) =>
    set(
      produce((state) => {
        if (rcst) state.cst = { name: "root", children: {} };
        if (rast) state.ast = { _name: "root", functionDeclarations: [] };
        if (rbril) state.bril = { functions: {}, data: new Map() };
        if (rbrilOptim) state.brilOptim = { functions: {}, data: new Map() };
        if (rcfg) state.cfg = {};
        state.wasm = [];
      })
    ),
}));

export interface RunState {
  heap_start: number; // memory offset in number of bytes
}

export const useRunStore = create<RunState>()((set) => ({
  heap_start: 10240,
  set: (fn: (state: RunState) => void) => set(produce(fn)),
}));
