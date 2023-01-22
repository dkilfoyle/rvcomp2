import { IBrilProgram } from "../bril/BrilInterface";
import { emitWasm } from "./brilToWasm";

export const runWasm = (bril: IBrilProgram) => {
  const wasmBuffer = emitWasm(bril);
  return WabtModule().then((wabtModule) => {
    const wasmModule = wabtModule.readWasm(wasmBuffer, { readDebugNames: true });
    wasmModule.applyNames();
    // wasmModule.generateNames();
    // wasmModule.validate();
    const memory = new WebAssembly.Memory({ initial: 1 });

    const getStringFromMemory = (offset: number) => {
      const buffer = new Uint8Array(memory.buffer, 0, 1024);
      let i = offset;
      let s = "";
      while (buffer[i] != 0) {
        s += String.fromCharCode(buffer[i]);
        i++;
        if (i > 100) throw new Error("End of string not found after 100 chars");
      }
      return s;
    };

    const importObject = {
      env: {
        print_int: (x: number) => window.conout3.info("From wasm: ", x),
        print_string: (x: number) => window.conout3.info("print_string: ", getStringFromMemory(x)),
        memory,
      },
    };
    return WebAssembly.instantiate(wasmModule.toBinary({}).buffer, importObject).then(function (res) {
      //run functions here
      console.info(`Running Wasm`);
      const startTime = performance.now();
      const myresult = res.instance.exports.main();
      const endTime = performance.now();
      // if (myresult != null)
      window.conout3.info(`Returned ${myresult}`);
      console.info(`Completed in ${(endTime - startTime).toFixed(1)}ms`);
      const data = new Uint8Array(memory.buffer, 0, 1024);
      const screen = new Uint8Array(memory.buffer, 1024, 100 * 100);
      const heap = new Uint8Array(memory.buffer, 1024 + 100 * 100, 1024 + 100 * 100 + 1024);
      return { data, screen, heap };
    });
  });
};
