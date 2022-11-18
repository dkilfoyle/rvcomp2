import { CstNode } from "chevrotain";
import { IBrilInstructionOrLabel, IBrilProgram } from "../languages/bril/BrilInterface";
import { ICFG } from "../languages/bril/cfgBuilder";
import { IAstProgram } from "../languages/simpleC/ast";

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { BrilBuilder } from "../languages/bril/BrilBuilder";

interface ParseState {
  cst: CstNode;
  ast: IAstProgram;
  bril: IBrilProgram;
  cfg: ICFG;
}

const initialState: ParseState = {
  cst: { name: "root", children: {} },
  ast: { _name: "root", functionDeclarations: [] },
  bril: { functions: [] },
  cfg: {},
};

interface ICfgBlockUpdate {
  fn: string;
  blockIndex: number;
  instructions: IBrilInstructionOrLabel[];
}

interface IBrilFunctionUpdate {
  fn: string;
  instructions: IBrilInstructionOrLabel[];
}

export const parseSlice = createSlice({
  name: "parse",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setCst: (state: ParseState, action: PayloadAction<CstNode>) => {
      state.cst = action.payload;
    },
    setAst: (state: ParseState, action: PayloadAction<IAstProgram>) => {
      state.ast = action.payload;
    },
    setBril: (state: ParseState, action: PayloadAction<IBrilProgram>) => {
      state.bril = action.payload;
    },
    setBrilFunctionInstructions: (state: ParseState, action: PayloadAction<IBrilFunctionUpdate>) => {
      const fn = state.bril.functions.find((f) => f.name == action.payload.fn);
      if (!fn) throw new Error(`Function ${action.payload.fn} not found in bril`);
      fn.instrs = [...action.payload.instructions];
    },
    setCfg: (state: ParseState, action: PayloadAction<ICFG>) => {
      state.cfg = action.payload;
    },
    setCfgBlockInstructions: (state: ParseState, action: PayloadAction<ICfgBlockUpdate>) => {
      state.cfg[action.payload.fn][action.payload.blockIndex].instructions = action.payload.instructions;
      state.cfg[action.payload.fn][action.payload.blockIndex].keyStart = action.payload.instructions[0].key || -1;
      state.cfg[action.payload.fn][action.payload.blockIndex].keyEnd =
        action.payload.instructions[action.payload.instructions.length - 1].key || -1;
    },
  },
});

export const { setCst, setAst, setBril, setCfg, setCfgBlockInstructions, setBrilFunctionInstructions } = parseSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectCst = (state: RootState) => state.parse.cst;
export const selectAst = (state: RootState) => state.parse.ast;
export const selectBril = (state: RootState) => state.parse.bril;
export const selectCfg = (state: RootState) => state.parse.cfg;

export default parseSlice.reducer;
