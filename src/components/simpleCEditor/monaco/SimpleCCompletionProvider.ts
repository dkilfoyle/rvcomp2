import * as monaco from "monaco-editor";
import { Adapter } from "./Adapter";

export class SimpleCCompletionProvider extends Adapter implements monaco.languages.CompletionItemProvider {
  async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    const word = model.getWordUntilPosition(position);
    var range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };
    // console.log("Word: ", word, range);

    const resource = model.uri;
    const worker = await this.worker(resource);
    const items = await worker.doCompletions(model.getOffsetAt(position), range);

    return { suggestions: items };
  }
}
