import * as monaco from "monaco-editor";

export const languageID = "wasm";

export const languageExtensionPoint: monaco.languages.ILanguageExtensionPoint = {
  id: languageID,
};
