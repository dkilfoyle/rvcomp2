import * as monaco from "monaco-editor";

export class BrilCompletionProvider implements monaco.languages.CompletionItemProvider {
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
    console.log("Word: ", word, range);

    const resource = model.uri;
    const items: monaco.languages.CompletionItem[] = [];

    return { suggestions: items };
  }
}
