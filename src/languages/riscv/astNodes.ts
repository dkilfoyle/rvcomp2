import { SymbolTable } from "./simulator/astBuilder";
import { Instruction } from "./Instruction";

export interface ASMRootNode {
  instructions: Instruction[];
  symbols: SymbolTable;
  labels: SymbolTable;
  dataSection: DataSection;
  globals: string[];
}

export class DataSection {
  data!: Uint8Array;
  pointer!: number;
  constructor() {
    this.reset();
  }
  reset() {
    this.data = new Uint8Array(1024);
    this.pointer = 0;
  }
  pushByte(x: number) {
    this.data[this.pointer++] = x & 0xff;
  }
  pushString(x: string) {
    for (let i = 0; i < x.length; i++) {
      this.pushByte(x.charCodeAt(i));
    }

    // pad to 4 byte aligned
    let pad = x.length % 4;
    while (pad--) {
      this.pushByte(0);
    }
  }
  pushWord(x: number) {
    this.pushByte(x);
    this.pushByte(x >> 8);
    this.pushByte(x >> 16);
    this.pushByte(x >> 24);
  }
  getBytes() {
    return this.data.slice(0, this.pointer);
  }

  getWords() {
    const bytes = this.data.slice(0, Math.max(0, this.pointer));

    // pad bytes to be 4 byte aligned
    let i = bytes.length;
    while (i % 4) bytes[i++] = 0;

    return new Int32Array(bytes.buffer);
  }
}
