import { IBrilProgram } from "../bril/BrilInterface";
import { emitWasm } from "./brilToWasm";

interface IWasmExports {
  main: () => void;
  heap_pointer: number;
}

export const runWasm = (bril: IBrilProgram) => {
  const wasmBuffer = emitWasm(bril);
  return WabtModule().then((wabtModule) => {
    const wasmModule = wabtModule.readWasm(wasmBuffer, { readDebugNames: true });
    wasmModule.applyNames();
    // wasmModule.generateNames();
    // wasmModule.validate();
    const memory = new WebAssembly.Memory({ initial: 1 });

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
        print_string: (x: number) => window.conout3.info(`print_string @ 0x${x.toString(16)}: ${getStringFromMemory(x)}`),
        print_char: (x: number) => window.conout3.info(`print_char: ${x} = 0x${x.toString(16)} = ${String.fromCharCode(x)}`),
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
      window.conout3.info(`Returned ${myresult || "void"}, heap_pointer = ${res.instance.exports.heap_pointer.value}`);
      console.info(`Completed in ${(endTime - startTime).toFixed(1)}ms`);
      // const data = new Uint8Array(memory.buffer, 0, 1024);
      // const screen = new Uint8ClampedArray(memory.buffer, 1024, 100 * 100);
      // const heap = new Uint8Array(memory.buffer, 1024 + 100 * 100, 1024 + 100 * 100 + 1024);
      // console.log(data.slice(0, 30));
      return { memory, heap_pointer: res.instance.exports.heap_pointer.value };
    });
  });
};
