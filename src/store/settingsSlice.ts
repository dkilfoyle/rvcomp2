import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface SettingsState {
  filename: string;
  resizeCount: number;
  cfg: {
    nodeName: string;
    functionName: string;
  };
  optim: {
    keepPhis: boolean;
    isSSA: boolean;
    doLVN: boolean;
    doDCE: boolean;
  };
  bril: {
    keepPhis: boolean;
    isSSA: boolean;
  };
}

const initialState: SettingsState = {
  filename: "ssaif.sc",
  resizeCount: 0,
  cfg: {
    nodeName: "",
    functionName: "main",
  },
  optim: {
    keepPhis: true,
    isSSA: true,
    doLVN: false,
    doDCE: false,
  },
  bril: {
    keepPhis: true,
    isSSA: true,
  },
};

export const settingsSlice = createSlice({
  name: "settings",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setFilename: (state: SettingsState, action: PayloadAction<string>) => {
      state.filename = action.payload;
    },
    setCfgNodeName: (state: SettingsState, action: PayloadAction<string>) => {
      state.cfg.nodeName = action.payload;
    },
    setCfgFunctionName: (state: SettingsState, action: PayloadAction<string>) => {
      state.cfg.functionName = action.payload;
    },
    setKeepPhis: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.keepPhis = action.payload;
    },
    setIsSSA: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.isSSA = action.payload;
    },
    setBrilKeepPhis: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.bril.keepPhis = action.payload;
    },
    setBrilIsSSA: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.bril.isSSA = action.payload;
    },
    setDoLVN: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.doLVN = action.payload;
    },
    setDoDCE: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.doDCE = action.payload;
    },
    incResizeCount: (state: SettingsState) => {
      state.resizeCount = state.resizeCount + 1;
    },
  },
});

export const {
  setFilename,
  incResizeCount,
  setCfgNodeName,
  setCfgFunctionName,
  setKeepPhis,
  setIsSSA,
  setDoDCE,
  setDoLVN,
  setBrilKeepPhis,
  setBrilIsSSA,
} = settingsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectFilename = (state: RootState) => state.settings.filename;
export const selectCfgNodeName = (state: RootState) => state.settings.cfg.nodeName;
export const selectCfgFunction = (state: RootState) => state.settings.cfg.functionName;
export const selectKeepPhis = (state: RootState) => state.settings.optim.keepPhis;
export const selectIsSSA = (state: RootState) => state.settings.optim.isSSA;
export const selectBrilKeepPhis = (state: RootState) => state.settings.bril.keepPhis;
export const selectBrilIsSSA = (state: RootState) => state.settings.bril.isSSA;
export const selectDoLVN = (state: RootState) => state.settings.optim.doLVN;
export const selectDoDCE = (state: RootState) => state.settings.optim.doDCE;
export const selectResizeCount = (state: RootState) => state.settings.resizeCount;

export default settingsSlice.reducer;
