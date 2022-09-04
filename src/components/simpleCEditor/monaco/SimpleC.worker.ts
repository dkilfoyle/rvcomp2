import * as worker from "monaco-editor/esm/vs/editor/editor.worker";
import { SimpleCWorker } from "./SimpleCWorker";

self.onmessage = () => {
  worker.initialize((ctx: any) => {
    return new SimpleCWorker(ctx);
  });
};
