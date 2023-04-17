import { unsignedSlice } from "../bits";
import { Device } from "./Device";

export class Memory extends Device {
  data: Uint8Array;
  constructor(firstAddress: number, size: number) {
    super(firstAddress, size);
    this.data = new Uint8Array(size);
  }

  reset() {
    this.data = new Uint8Array(this.data.length);
  }

  localRead(address: number, size: number) {
    let result = 0;
    for (let i = 0; i < size; i++) {
      result |= this.data[address + i] << (8 * i);
    }
    return result;
  }

  localWrite(address: number, size: number, value: number) {
    for (let i = 0; i < size; i++) {
      this.data[address + i] = unsignedSlice(value, 8 * i + 7, 8 * i);
    }
  }
}
