import * as monaco from "monaco-editor";
import { languageExtensionPoint, languageID } from "./config";
import { richLanguageConfiguration, monarchLanguage } from "./simpleCMonarch";
import { WorkerManager } from "./WorkerManager";
import DiagnosticsAdapter from "./DiagnosticsAdapter";
import SimpleCFormattingProvider from "./SimpleCFormattingProvider";
import { SimpleCWorker } from "./SimpleCWorker";
import SimpleCSymbolProvider from "./SimpleCSymbolProvider";

export function setupLanguage() {
  monaco.languages.register(languageExtensionPoint);
  monaco.languages.onLanguage(languageID, () => {
    monaco.languages.setMonarchTokensProvider(languageID, monarchLanguage);
    monaco.languages.setLanguageConfiguration(languageID, richLanguageConfiguration);

    const client = new WorkerManager();
    const worker: WorkerAccessor = (...uris: monaco.Uri[]): Promise<SimpleCWorker> => {
      return client.getLanguageServiceWorker(...uris);
    };

    monaco.languages.registerDocumentFormattingEditProvider(languageID, new SimpleCFormattingProvider(worker));
    new DiagnosticsAdapter(worker);
    monaco.languages.registerDocumentSymbolProvider(languageID, new SimpleCSymbolProvider(worker));
  });
}

export type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<SimpleCWorker>;
