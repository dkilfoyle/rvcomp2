import * as monaco from "monaco-editor";
import { languageExtensionPoint, languageID } from "./config";
import { richLanguageConfiguration, monarchLanguage } from "./riscvMonarch";

export function setupLanguage() {
  monaco.languages.register(languageExtensionPoint);
  monaco.languages.onLanguage(languageID, () => {
    monaco.languages.setMonarchTokensProvider(languageID, monarchLanguage);
    monaco.languages.setLanguageConfiguration(languageID, richLanguageConfiguration);

    // monaco.languages.registerDocumentFormattingEditProvider(languageID, new SimpleCFormattingProvider(worker));
    // monaco.languages.registerDocumentSymbolProvider(languageID, new SimpleCSymbolProvider(worker));
    // monaco.languages.registerSignatureHelpProvider(languageID, new SimpleCSignatureHelpProvider(worker));
    // monaco.languages.registerCompletionItemProvider(languageID, new SimpleCCompletionProvider(worker));
  });
}
