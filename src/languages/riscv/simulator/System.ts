import { IBrilProgram } from "../../bril/BrilInterface";
import { Bus } from "./Bus";
import { Memory } from "./Memory";
import { Processor } from "./Processor";

export const memSize = 4096;

class RiscvError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = RiscvError.name;
  }
}

function error(message: string): RiscvError {
  return new RiscvError(message);
}

let instrCount = 0;
let memory: DataView;
let heap_pointer: number = 0;
let heap_start: number = 0;
let data_start: number = 0;
let optimLevel: string;

export class Computer {
  bus: Bus;
  cpu: Processor;
  mem: Memory;
  memWords: number[] = [];

  constructor() {
    this.bus = new Bus();
    this.cpu = new Processor(32, this.bus);
    this.mem = new Memory(0, memSize);
    this.bus.addDevice(this.mem);
  }
  reset() {
    this.mem.reset();
    this.cpu.reset();
  }
  resetAndLoad(memWords: number[], metas: Map<number, any>) {
    this.reset();
    this.memWords = [...memWords];
    this.cpu.metas = metas;
    memWords.forEach((word, i) => this.mem.write(i * 4, 4, word));
  }
  resetAndReload() {
    this.resetAndLoad(this.memWords, this.cpu.metas);
  }
  step() {
    if (this.cpu.state === "fetch") this.cpu.fetch();
    if (this.cpu.state === "decode") this.cpu.decode();
    if (this.cpu.state === "ecall") this.cpu.ecall();
    if (this.cpu.state === "halt") return;
    if (this.cpu.state === "decode") this.cpu.decode();
    if (this.cpu.state === "compute") this.cpu.compute();
    if (this.cpu.state === "compare") this.cpu.compare();
    if (this.cpu.state === "loadStoreWriteBack") this.cpu.loadStoreWriteBack();
    if (this.cpu.state === "updatePC") this.cpu.updatePC();
  }
  run() {
    while (this.cpu.state !== "halt") this.step();
    // todo
  }
}

interface ILogger {
  warn: (id: "console" | "output", msg: string, dump?: any) => void;
  info: (id: "console" | "output", msg: string, dump?: any) => void;
  log: (id: "console" | "output", msg: string, dump?: any) => void;
  error: (id: "console" | "output", msg: string, dump?: any) => void;
}

const logger: ILogger = {
  warn: (id, msg, dump) => postMessage({ action: "log", payload: { id, level: "warn", logmsg: msg, dump } }),
  info: (id, msg, dump) => postMessage({ action: "log", payload: { id, level: "info", logmsg: msg, dump } }),
  log: (id, msg, dump) => postMessage({ action: "log", payload: { id, level: "log", logmsg: msg, dump } }),
  error: (id, msg, dump) => postMessage({ action: "log", payload: { id, level: "error", logmsg: msg, dump } }),
};

// todo change first param to memwords
export function runInterpretor(memWords: number[], metas: Map<number, any>, myoptimLevel = "Unknown") {
  try {
    logger.info("console", `Running RiscV ${myoptimLevel}...`);
    // instrCount = 0;
    // optimLevel = myoptimLevel;

    const startTime = performance.now();
    const computer = new Computer();
    computer.resetAndLoad(memWords, metas);
    const result = computer.run();
    const endTime = performance.now();

    if (result != null) logger.info("console", `Returned ${result}`);
    logger.info("console", ` - Exited at PC = ${computer.cpu.pc}`);
    logger.info("console", ` - Elapsed ${(endTime - startTime).toFixed(1)}ms`);
    // logger.info("console", " - State.env: ", state.env);
    console.log("computer:", computer);
    return computer;
  } catch (e) {
    if (e instanceof RiscvError) {
      logger.error("output", `error: ${e.message}`);
    } else {
      throw e;
    }
    return Computer;
  }
}

self.onmessage = async ({ data }) => {
  const { action, payload } = data;
  switch (action) {
    case "main":
      const computer = runInterpretor(payload.memWords, payload.metas, payload.optimLevel);
      postMessage({ action: "done", payload: { computer, optimLevel: payload.optimLevel } });
      break;
  }
};
