import _ from "lodash";
import { IBrilProgram } from "../bril/BrilInterface";
import { emitWasm } from "./brilToWasm";

interface IWasmExports {
  main: () => void;
  heap_pointer: number;
}

export interface IRuntimeOptions {
  canvasId: string;
  mainFn: string;
  mainArgs?: number[];
  loopFn?: string;
  loopDelay?: number;
  loopTimes?: number;
}

let memory: WebAssembly.Memory = new WebAssembly.Memory({ initial: 1 });

export const runWasm = (wasmBuffer: Uint8Array, runtime: IRuntimeOptions) => {
  return WabtModule().then((wabtModule) => {
    const wasmModule = wabtModule.readWasm(wasmBuffer, { readDebugNames: true });
    wasmModule.applyNames();
    // wasmModule.generateNames();
    // wasmModule.validate();

    if (runtime.mainFn) memory = new WebAssembly.Memory({ initial: 1 });

    const screenCanvas = document.getElementById(runtime.canvasId) as HTMLCanvasElement;
    if (!screenCanvas) throw new Error(`HTML document canvas ${runtime.canvasId} does not exist`);
    const screenCtx = screenCanvas.getContext("2d");
    if (!screenCtx) throw new Error(`Unable to create canvas ctx`);

    const getStringFromMemory = (offset: number) => {
      const buffer = new Uint8Array(memory.buffer, offset, 100);
      let i = 0;
      let s = "";
      while (buffer[i] != 0) {
        s += String.fromCharCode(buffer[i]);
        i++;
        if (i == 100) throw new Error("End of string not found after 100 chars");
      }
      return s;
    };

    const importObject = {
      env: {
        print_int: (x: number) => window.conout3.info("print_int: ", x),
        print_bool: (x: boolean) => window.conout3.info("print_bool: ", x ? "true" : "false"),
        print_float: (x: number) => window.conout3.info("print_float: ", x),
        print_string: (x: number) => window.conout3.info(`print_string @ 0x${x.toString(16)}: ${getStringFromMemory(x)}`),
        print_char: (x: number) => window.conout3.info(`print_char: ${x} = 0x${x.toString(16)} = ${String.fromCharCode(x)}`),
        render: () => {
          const screenData = new Uint8ClampedArray(memory.buffer, 0, 100 * 100 * 4);
          const screenImage = new ImageData(screenData.slice(0, 100 * 100 * 4), 100, 100);
          screenCtx.putImageData(screenImage, 0, 0);
        },
        random: () => Math.random(),
        memory,
      },
    };

    return WebAssembly.instantiate(wasmModule.toBinary({}).buffer, importObject).then(function (res) {
      //run functions here
      window.conout0.info(`Running Wasm...`);
      const loopDelay = _.defaultTo(runtime.loopDelay, 1000);
      const loopTimes = _.defaultTo(runtime.loopTimes, (loopDelay / 1000) * 10); // 10 seconds

      const startTime = performance.now();
      let myresult;
      if (runtime.mainFn) {
        window.conout3.info(`Executing ${runtime.mainFn}`);
        myresult = runtime.mainArgs ? res.instance.exports[runtime.mainFn](...runtime.mainArgs) : res.instance.exports[runtime.mainFn]();
        window.conout3.info(` - Returned ${myresult || "void"}`);
        window.conout3.info(` - Heap_pointer = ${res.instance.exports.heap_pointer.value}`);
      }

      if (runtime.loopFn && runtime.loopFn in res.instance.exports && loopTimes > 0) {
        window.conout3.info(`Looping ${runtime.loopFn} n=${loopTimes}`);
        let loopCounter = 0;
        const loopInterval = setInterval(() => {
          const loopResult = res.instance.exports[runtime.loopFn]();
          if (!loopResult) {
            window.conout3.info(` - Exited after frame ${loopCounter}`);
            window.conout3.info(` - Heap_pointer = ${res.instance.exports.heap_pointer.value}`);
            clearInterval(loopInterval);
          }
          loopCounter++;
          if (loopCounter >= loopTimes) {
            window.conout3.info(` - Halted after frame ${loopCounter}`);
            window.conout3.info(` - Heap_pointer = ${res.instance.exports.heap_pointer.value}`);
            clearInterval(loopInterval);
          }
        }, loopDelay);
      }

      const endTime = performance.now();
      // if (myresult != null)
      window.conout0.info(` - Wasm completed in ${(endTime - startTime).toFixed(1)}ms`);
      // const data = new Uint8Array(memory.buffer, 0, 1024);
      // const screen = new Uint8ClampedArray(memory.buffer, 1024, 100 * 100);
      // const heap = new Uint8Array(memory.buffer, 1024 + 100 * 100, 1024 + 100 * 100 + 1024);
      // console.log(data.slice(0, 30));
      return { memory, heap_pointer: res.instance.exports.heap_pointer.value };
    });
  });
};
