import * as monaco from "monaco-editor";
import { languageExtensionPoint, languageID } from "./config";
import { richLanguageConfiguration, monarchLanguage } from "./simpleCMonarch";
import { WorkerManager } from "./WorkerManager";
import DiagnosticsAdapter from "./DiagnosticsAdapter";
import SimpleCFormattingProvider from "./SimpleCFormattingProvider";
import { SimpleCWorker } from "./SimpleCWorker";
import SimpleCSymbolProvider from "./SimpleCSymbolProvider";
import SimpleCSignatureHelpProvider from "./SimpleCSignatureHelpProvider";
import { SimpleCCompletionProvider } from "./SimpleCCompletionProvider";

export function setupLanguage() {
  monaco.languages.register(languageExtensionPoint);
  monaco.languages.onLanguage(languageID, () => {
    monaco.languages.setMonarchTokensProvider(languageID, monarchLanguage);
    monaco.languages.setLanguageConfiguration(languageID, richLanguageConfiguration);

    const client = new WorkerManager();
    const worker: WorkerAccessor = (...uris: monaco.Uri[]): Promise<SimpleCWorker> => {
      return client.getLanguageServiceWorker(...uris);
    };

    new DiagnosticsAdapter(worker); // TODO: rewrite as registerDocumentMarkerProvider from https://github.com/remcohaszing/monaco-marker-data-provider/blob/main/index.ts
    monaco.languages.registerDocumentFormattingEditProvider(languageID, new SimpleCFormattingProvider(worker));
    monaco.languages.registerDocumentSymbolProvider(languageID, new SimpleCSymbolProvider(worker));
    monaco.languages.registerSignatureHelpProvider(languageID, new SimpleCSignatureHelpProvider(worker));
    monaco.languages.registerCompletionItemProvider(languageID, new SimpleCCompletionProvider(worker));
  });
}

export type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<SimpleCWorker>;
