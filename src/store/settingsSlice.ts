import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface SettingsState {
  filename: string;
  cfg: {
    nodeName: string;
    functionName: string;
  };
}

const initialState: SettingsState = {
  filename: "ssaif.sc",
  cfg: {
    nodeName: "",
    functionName: "main",
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
  },
});

export const { setFilename, setCfgNodeName, setCfgFunctionName } = settingsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectFilename = (state: RootState) => state.settings.filename;
export const selectCfgNodeName = (state: RootState) => state.settings.cfg.nodeName;
export const selectCfgFunction = (state: RootState) => state.settings.cfg.functionName;

export default settingsSlice.reducer;
