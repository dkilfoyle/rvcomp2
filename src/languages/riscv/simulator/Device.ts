import { signedSlice, unsigned, unsignedSlice } from "../utils/bits";

export class Device {
  size: number;
  firstAddress: number;
  lastAddress: number;

  constructor(firstAddress, size) {
    this.size = size;
    this.firstAddress = unsigned(firstAddress);
    this.lastAddress = unsigned(firstAddress + size - 1);
  }

  reset() {
    // Abstract
  }

  accepts(address, size) {
    return address >= this.firstAddress && unsigned(address + size - 1) <= this.lastAddress;
  }

  read(address, size, signed) {
    const raw = this.localRead(unsigned(address - this.firstAddress), size);
    return signed ? signedSlice(raw, size * 8 - 1, 0) : unsignedSlice(raw, size * 8 - 1, 0);
  }

  write(address, size, value) {
    this.localWrite(unsigned(address - this.firstAddress), size, value);
  }

  localRead(address, size) {
    // Abstract
    return 0;
  }

  localWrite(address, size, value) {
    // Abstract
  }

  hasData() {
    // Abstract
    return false;
  }

  getData() {
    // Abstract
    return 0;
  }

  irq() {
    return false;
  }
}
