import { unsigned } from "../utils/bits";
import { Device } from "./Device";

export class Bus {
  devices: Device[];
  error: boolean;
  lastAddress: number;

  constructor() {
    this.devices = [];
    this.error = false;
    this.lastAddress = 0;
  }

  reset() {
    for (let d of this.devices) {
      d.reset();
    }
    this.lastAddress = 0;
  }

  addDevice(device) {
    this.devices.push(device);
  }

  getDevices(address: number, size: number) {
    address = unsigned(address);
    return this.devices.filter((dev) => dev.accepts(address, size));
  }

  readString(address: number) {
    address = unsigned(address);
    this.lastAddress = address;
    const devices = this.getDevices(address, 1);
    if (!devices.length) throw new Error();

    let ch = devices[0].read(address, 1, false);
    let str = [ch];
    let offset = 1;
    while (ch !== 0 && offset < 100) {
      ch = devices[0].read(address + offset, 1, false);
      if (ch !== 0) str.push(ch);
      offset++;
    }
    return String.fromCharCode(...str);
  }

  read(address: number, size: number, signed: boolean) {
    address = unsigned(address);
    this.lastAddress = address;
    const devices = this.getDevices(address, size);
    this.error = !devices.length;
    return this.error ? 0 : devices[0].read(address, size, signed);
  }

  write(address: number, size: number, value: number) {
    this.lastAddress = unsigned(address);
    const devices = this.getDevices(address, size);
    this.error = !devices.length;
    for (let d of devices) {
      d.write(address, size, value);
    }
  }

  irq() {
    return this.devices.some((dev) => dev.irq());
  }
}
