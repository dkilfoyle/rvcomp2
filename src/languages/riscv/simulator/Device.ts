import { signedSlice, unsigned, unsignedSlice } from "../bits";

export class Device {
  size: number;
  firstAddress: number;
  lastAddress: number;

  constructor(firstAddress: number, size: number) {
    this.size = size;
    this.firstAddress = unsigned(firstAddress);
    this.lastAddress = unsigned(firstAddress + size - 1);
  }

  reset() {
    // Abstract
  }

  accepts(address: number, size: number) {
    return address >= this.firstAddress && unsigned(address + size - 1) <= this.lastAddress;
  }

  read(address: number, size: number, signed: boolean) {
    const raw = this.localRead(unsigned(address - this.firstAddress), size);
    return signed ? signedSlice(raw, size * 8 - 1, 0) : unsignedSlice(raw, size * 8 - 1, 0);
  }

  write(address: number, size: number, value: number) {
    this.localWrite(unsigned(address - this.firstAddress), size, value);
  }

  localRead(address: number, size: number) {
    // Abstract
    return 0;
  }

  localWrite(address: number, size: number, value: number) {
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
