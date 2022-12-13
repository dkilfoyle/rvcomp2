import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface SettingsState {
  filename: string;
  cfg: {
    nodeName: string;
    functionName: string;
  };
  optim: {
    keepPhis: boolean;
    doSSA: boolean;
    doLVN: boolean;
    doDCE: boolean;
  };
}

const initialState: SettingsState = {
  filename: "ssaif.sc",
  cfg: {
    nodeName: "",
    functionName: "main",
  },
  optim: {
    keepPhis: true,
    doSSA: true,
    doLVN: false,
    doDCE: false,
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
    setDoSSA: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.doSSA = action.payload;
    },
    setDoLVN: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.doLVN = action.payload;
    },
    setDoDCE: (state: SettingsState, action: PayloadAction<boolean>) => {
      state.optim.doDCE = action.payload;
    },
  },
});

export const { setFilename, setCfgNodeName, setCfgFunctionName, setKeepPhis, setDoSSA, setDoDCE, setDoLVN } = settingsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectFilename = (state: RootState) => state.settings.filename;
export const selectCfgNodeName = (state: RootState) => state.settings.cfg.nodeName;
export const selectCfgFunction = (state: RootState) => state.settings.cfg.functionName;
export const selectKeepPhis = (state: RootState) => state.settings.optim.keepPhis;
export const selectDoSSA = (state: RootState) => state.settings.optim.doSSA;
export const selectDoLVN = (state: RootState) => state.settings.optim.doLVN;
export const selectDoDCE = (state: RootState) => state.settings.optim.doDCE;

export default settingsSlice.reducer;
