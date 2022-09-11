import * as monaco from "monaco-editor";
import { WorkerAccessor } from "./setup";

// function toDocumentSymbol(item: ls.DocumentSymbol): monaco.languages.DocumentSymbol {
//   return {
//     detail: item.detail || "",
//     range: toRange(item.range),
//     name: item.name,
//     kind: toSymbolKind(item.kind),
//     selectionRange: toRange(item.selectionRange),
//     children: item.children.map(toDocumentSymbol),
//     tags: [],
//   };
// }

export default class SimpleCSymbolProvider implements monaco.languages.DocumentSymbolProvider {
  constructor(private worker: WorkerAccessor) {}

  async provideDocumentSymbols(model: monaco.editor.ITextModel) {
    // get the worker proxy
    const resource = model.uri;
    const worker = await this.worker(resource);

    // get document symbols from the worker
    const items = await worker.doSymbols();
    if (!items) {
      return;
    }
    return items;
  }
}
