import { unsignedSlice } from "../utils/bits";
import { Device } from "./Device";

export class Memory extends Device {
  data: Uint8Array;
  constructor(firstAddress, size) {
    super(firstAddress, size);
    this.data = new Uint8Array(size);
  }

  reset() {
    this.data = new Uint8Array(this.data.length);
  }

  localRead(address, size) {
    let result = 0;
    for (let i = 0; i < size; i++) {
      result |= this.data[address + i] << (8 * i);
    }
    return result;
  }

  localWrite(address, size, value) {
    for (let i = 0; i < size; i++) {
      this.data[address + i] = unsignedSlice(value, 8 * i + 7, 8 * i);
    }
  }
}
