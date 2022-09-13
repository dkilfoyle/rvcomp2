import { WorkerAccessor } from "./setup";

export abstract class Adapter {
  constructor(protected worker: WorkerAccessor) {}
}
