import produce from "immer";
import create from "zustand";

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
    doDCE: boolean;
  };
  bril: {
    keepPhis: boolean;
    isSSA: boolean;
  };
  set: (fn: (state: SettingsState) => void) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  filename: "ssaif.sc",
  cfg: {
    nodeName: "",
    functionName: "main",
  },
  optim: {
    keepPhis: true,
    isSSA: true,
    doLVN: false,
    doGVN: false,
    doDCE: false,
  },
  bril: {
    keepPhis: true,
    isSSA: true,
  },
  set: (fn: (state: SettingsState) => void) => set(produce(fn)),
}));
