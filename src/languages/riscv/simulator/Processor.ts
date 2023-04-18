// Adapted from https://raw.githubusercontent.com/Guillaume-Savaton-ESEO/emulsiV/master/src/virgule.js

import _ from "lodash";
import { Instruction } from "../Instruction";
import { unsignedSlice, signed, unsigned } from "../bits";
import { Bus } from "./Bus.js";
import { logger, memSize } from "./System";

interface Datapath {
  src1?: "pc" | "x1";
  src2?: "imm" | "x2";
  aluOp?: "add" | "sll" | "slt" | "sltu" | "xor" | "srl" | "sra" | "or" | "and" | "sub" | "b";
  wbMem?: "r" | "pc+" | "lb" | "lh" | "lw" | "lbu" | "lhu" | "sb" | "sh" | "sw";
  branch?: "al" | "eq" | "ne" | "lt" | "ge" | "ltu" | "geu";
}

// prettier-ignore
const ACTION_TABLE: Record<string, Datapath> = {
  lui:    {             src2: "imm", aluOp: "b",    wbMem: "r" },
  auipc:  { src1: "pc", src2: "imm", aluOp: "add",  wbMem: "r" },
  jal:    { src1: "pc", src2: "imm", aluOp: "add",  wbMem: "pc+", branch: "al" },
  jalr:   { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "pc+", branch: "al" },
  beq:    { src1: "pc", src2: "imm", aluOp: "add",                branch: "eq" },
  bne:    { src1: "pc", src2: "imm", aluOp: "add",                branch: "ne" },
  blt:    { src1: "pc", src2: "imm", aluOp: "add",                branch: "lt" },
  bge:    { src1: "pc", src2: "imm", aluOp: "add",                branch: "ge" },
  bltu:   { src1: "pc", src2: "imm", aluOp: "add",                branch: "ltu" },
  bgeu:   { src1: "pc", src2: "imm", aluOp: "add",                branch: "geu" },
  lb:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lb" },
  lh:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lh" },
  lw:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lw" },
  lbu:    { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lbu" },
  lhu:    { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lhu" },
  sb:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sb" },
  sh:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sh" },
  sw:     { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sw" },
  addi:   { src1: "x1", src2: "imm", aluOp: "add",  wbMem: "r" },
  slli:   { src1: "x1", src2: "imm", aluOp: "sll",  wbMem: "r" },
  slti:   { src1: "x1", src2: "imm", aluOp: "slt",  wbMem: "r" },
  sltiu:  { src1: "x1", src2: "imm", aluOp: "sltu", wbMem: "r" },
  xori:   { src1: "x1", src2: "imm", aluOp: "xor",  wbMem: "r" },
  srli:   { src1: "x1", src2: "imm", aluOp: "srl",  wbMem: "r" },
  srai:   { src1: "x1", src2: "imm", aluOp: "sra",  wbMem: "r" },
  ori:    { src1: "x1", src2: "imm", aluOp: "or",   wbMem: "r" },
  andi:   { src1: "x1", src2: "imm", aluOp: "and",  wbMem: "r" },
  add:    { src1: "x1", src2: "x2",  aluOp: "add",  wbMem: "r" },
  sub:    { src1: "x1", src2: "x2",  aluOp: "sub",  wbMem: "r" },
  sll:    { src1: "x1", src2: "x2",  aluOp: "sll",  wbMem: "r" },
  slt:    { src1: "x1", src2: "x2",  aluOp: "slt",  wbMem: "r" },
  sltu:   { src1: "x1", src2: "x2",  aluOp: "sltu", wbMem: "r" },
  xor:    { src1: "x1", src2: "x2",  aluOp: "xor",  wbMem: "r" },
  srl:    { src1: "x1", src2: "x2",  aluOp: "srl",  wbMem: "r" },
  sra:    { src1: "x1", src2: "x2",  aluOp: "sra",  wbMem: "r" },
  or:     { src1: "x1", src2: "x2",  aluOp: "or",   wbMem: "r" },
  and:    { src1: "x1", src2: "x2",  aluOp: "and",  wbMem: "r" },
  ecall:  {},
  nop:    {},
  mret:   {},
  invalid:{},
};

export class Processor {
  x: number[];
  pc: number = 0;
  pcLast: number = 0;
  mepc: number = 0;
  bus: Bus;
  fetchData: number = 0x13;
  fetchError: boolean = false;
  x1: number = 0;
  x2: number = 0;
  aluResult: number = 0;
  branchTaken: boolean = false;
  loadData: number = 0;
  loadStoreError: boolean = false;
  state: "halt" | "fetch" | "decode" | "compute" | "updatePC" | "compare" | "loadStoreWriteBack" | "ecall" = "fetch";
  instr: Instruction = new Instruction("add", {}, {});
  datapath: Datapath = {};
  irqState: boolean = false;
  acceptingIrq: boolean = false;
  console: string[] = [];
  isExit: boolean = false;
  metas: Map<number, any> = new Map();

  constructor(nx: number, bus: Bus) {
    this.x = new Array(nx);
    this.bus = bus;
    this.reset();
  }

  reset() {
    for (let i = 0; i < this.x.length; i++) {
      this.x[i] = 0;
    }
    this.x[2] = memSize;
    this.pc = 0;
    this.pcLast = 0;
    this.mepc = 0;
    this.fetchData = 0x13;
    this.fetchError = false;
    this.decode();
    this.x1 = 0;
    this.x2 = 0;
    this.aluResult = 0;
    this.branchTaken = false;
    this.loadData = 0;
    this.loadStoreError = false;
    this.state = "fetch";
    this.console = [];
    this.isExit = false;
  }

  fetch() {
    this.fetchData = this.bus.read(this.pc, 4, false);
    this.fetchError = this.bus.error;
    this.state = "decode";
    // console.log("Fetch: ", this.fetchData);
  }

  decode() {
    this.instr = Instruction.Decode(this.fetchData, this.metas.get(this.pc));
    this.datapath = ACTION_TABLE[this.instr.opName];
    console.log("Decode: ", this.instr.opName, this.instr); //, this.datapath);
    this.state = this.datapath.aluOp ? "compute" : "updatePC";

    if (this.instr.opName === "ecall") {
      this.state = "ecall";
    }
  }

  ecall() {
    const a1 = this.getX(11); // a1
    const etype = this.getX(10); // a0
    switch (etype) {
      case 1: // print_int
        logger.info("output", `${a1}`);
        break;
      case 4:
        const str = this.bus.readString(a1);
        this.console.push(str);
        console.log("ecall printstring: ", str);
        break;
      case 10: // exit
        this.state = "halt";
        console.log("ecall exit");
        return;
    }
    this.state = "updatePC";
  }

  compute() {
    // Read registers.
    if (_.isUndefined(this.instr.params.rs1)) throw Error();
    if (_.isUndefined(this.instr.params.rs2)) throw Error();
    this.x1 = this.getX(this.instr.params.rs1);
    this.x2 = this.getX(this.instr.params.rs2);

    // Select ALU operand A
    let a = 0;
    switch (this.datapath.src1) {
      case "pc":
        a = this.pc;
        break;
      case "x1":
        a = this.x1;
        break;
    }

    // Select ALU operand B
    let b = 0;
    switch (this.datapath.src2) {
      case "imm":
        b = this.instr.params.imm || 0;
        break;
      case "x2":
        b = this.x2;
        break;
    }

    // Perform ALU operation
    this.aluResult = 0;
    switch (this.datapath.aluOp) {
      case "b":
        this.aluResult = b;
        break;
      case "add":
        this.aluResult = signed(a + b);
        break;
      case "sll":
        this.aluResult = a << unsignedSlice(b, 4, 0);
        break;
      case "slt":
        this.aluResult = signed(a) < signed(b) ? 1 : 0;
        break;
      case "sltu":
        this.aluResult = unsigned(a) < unsigned(b) ? 1 : 0;
        break;
      case "xor":
        this.aluResult = a ^ b;
        break;
      case "srl":
        this.aluResult = a >>> unsignedSlice(b, 4, 0);
        break;
      case "sra":
        this.aluResult = a >> unsignedSlice(b, 4, 0);
        break;
      case "or":
        this.aluResult = a | b;
        break;
      case "and":
        this.aluResult = a & b;
        break;
      case "sub":
        this.aluResult = signed(a - b);
        break;
    }

    this.branchTaken = !_.isUndefined(this.datapath.branch) && this.datapath.branch === "al";

    if (this.datapath.branch && this.datapath.branch !== "al") {
      this.state = "compare";
    } else if ((this.datapath.wbMem !== "r" && this.datapath.wbMem !== "pc+") || this.instr.params.rd) {
      this.state = "loadStoreWriteBack";
    } else {
      this.state = "updatePC";
    }
  }

  compare() {
    switch (this.datapath.branch) {
      case "eq":
        this.branchTaken = this.x1 === this.x2;
        break;
      case "ne":
        this.branchTaken = this.x1 !== this.x2;
        break;
      case "lt":
        this.branchTaken = this.x1 < this.x2;
        break;
      case "ge":
        this.branchTaken = this.x1 >= this.x2;
        break;
      case "ltu":
        this.branchTaken = unsigned(this.x1) < unsigned(this.x2);
        break;
      case "geu":
        this.branchTaken = unsigned(this.x1) >= unsigned(this.x2);
        break;
      default:
        this.branchTaken = false;
    }

    this.state = "updatePC";
  }

  loadStoreWriteBack() {
    this.loadData = 0;
    switch (this.datapath.wbMem) {
      case "r":
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.setX(this.instr.params.rd, this.aluResult);
        break;
      case "pc+":
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.setX(this.instr.params.rd, this.pcNext);
        break;
      case "lb":
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.loadData = this.bus.read(this.aluResult, 1, true);
        this.setX(this.instr.params.rd, this.loadData);
        break;
      case "lh":
        this.loadData = this.bus.read(this.aluResult, 2, true);
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.setX(this.instr.params.rd, this.loadData);
        break;
      case "lw":
        this.loadData = this.bus.read(this.aluResult, 4, true);
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.setX(this.instr.params.rd, this.loadData);
        break;
      case "lbu":
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.loadData = this.bus.read(this.aluResult, 1, false);
        this.setX(this.instr.params.rd, this.loadData);
        break;
      case "lhu":
        if (_.isUndefined(this.instr.params.rd)) throw Error();
        this.loadData = this.bus.read(this.aluResult, 2, false);
        this.setX(this.instr.params.rd, this.loadData);
        break;
      case "sb":
        this.bus.write(this.aluResult, 1, this.x2);
        break;
      case "sh":
        this.bus.write(this.aluResult, 2, this.x2);
        break;
      case "sw":
        this.bus.write(this.aluResult, 4, this.x2);
        break;
    }

    this.loadStoreError =
      !_.isUndefined(this.datapath.wbMem) && (this.datapath.wbMem[0] === "l" || this.datapath.wbMem[0] === "s") && this.bus.error;
    this.state = "updatePC";
  }

  halt() {
    console.log("halted");
  }

  get pcNext() {
    return unsigned(this.pc + 4);
  }

  updatePC() {
    this.pcLast = this.pc;
    this.acceptingIrq = this.bus.irq() && !this.irqState;
    if (this.acceptingIrq) {
      this.mepc = this.branchTaken ? this.aluResult : this.pcNext;
      this.setPc(4);
      this.irqState = true;
    } else if (this.instr.opName === "mret") {
      this.setPc(this.mepc);
      this.irqState = false;
    } else if (this.branchTaken) {
      this.setPc(this.aluResult);
    } else {
      this.setPc(this.pcNext);
    }

    this.state = "fetch";
  }

  step() {
    this[this.state]();
  }

  setX(index: number, value: number) {
    if (index > 0 && index < this.x.length) {
      this.x[index] = signed(value);
    }
  }

  getX(index: number) {
    if (index > 0 && index < this.x.length) {
      return this.x[index];
    }
    return 0;
  }

  setPc(value: number) {
    this.pc = unsigned(value & ~3);
  }
}
