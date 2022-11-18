import * as monaco from "monaco-editor";

import Uri = monaco.Uri;
import { SimpleCWorker } from "./SimpleCWorker";
import { languageID } from "./config";

export class WorkerManager {
  private worker: monaco.editor.MonacoWebWorker<SimpleCWorker> | null;
  private workerClientProxy: Promise<SimpleCWorker> | null;

  constructor() {
    this.worker = null;
    this.workerClientProxy = null;
  }

  private getClientproxy(): Promise<SimpleCWorker> {
    if (!this.workerClientProxy) {
      this.worker = monaco.editor.createWebWorker<SimpleCWorker>({
        // module that exports the create() method and returns a `JSONWorker` instance
        moduleId: "SimpleCWorker",
        label: languageID,
        // passed in to the create() method
        createData: {
          languageId: languageID,
        },
      });

      this.workerClientProxy = <Promise<SimpleCWorker>>(<any>this.worker.getProxy());
    }

    return this.workerClientProxy;
  }

  async getLanguageServiceWorker(...resources: Uri[]): Promise<SimpleCWorker> {
    const _client: SimpleCWorker = await this.getClientproxy();
    await this.worker?.withSyncedResources(resources);
    return _client;
  }
}
