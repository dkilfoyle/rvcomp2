import { IBrilDataItem } from "../bril/BrilInterface";
import { DataSection } from "./DataSection";
import { Instruction, InstructionParameters } from "./Instruction";
import { getBits } from "./bits";

export enum R {
  SP = "sp",
  RA = "ra",
  FP = "s0",
  GP = "gp",
  ZERO = "x0",

  A0 = "a0",
  A1 = "a1",
  A2 = "a2",
  A3 = "a3",
  A4 = "a4",
  A5 = "a5",
  A6 = "a6",
  A7 = "a7",
  a0 = "a0",
  a1 = "a1",
  a2 = "a2",
  a3 = "a3",
  a4 = "a4",
  a5 = "a5",
  a6 = "a6",
  a7 = "a7",

  T0 = "t0",
  T1 = "t1",
  T2 = "t2",
  T3 = "t3",
  T4 = "t4",
  T5 = "t5",
  T6 = "t6",
  t0 = "t0",
  t1 = "t1",
  t2 = "t2",
  t3 = "t3",
  t4 = "t4",
  t5 = "t5",
  t6 = "t6",

  S0 = "s0",
  S1 = "s1",
  S2 = "s2",
  S3 = "s3",
  S4 = "s4",
  S5 = "s5",
  S6 = "s6",
  S7 = "s7",
  S8 = "s8",
  S9 = "s9",
  S10 = "s10",
  S11 = "s11",
  s0 = "s0",
  s1 = "s1",
  s2 = "s2",
  s3 = "s3",
  s4 = "s4",
  s5 = "s5",
  s6 = "s6",
  s7 = "s7",
  s8 = "s8",
  s9 = "s9",
  s10 = "s10",
  s11 = "s11",
}

export const regNum = {
  zero: 0,
  ra: 1,
  sp: 2,
  gp: 3,
  tp: 4,
  t0: 5,
  t1: 6,
  t2: 7,
  s0: 8,
  s1: 9,
  a0: 10,
  a1: 11,
  a2: 12,
  a3: 13,
  a4: 14,
  a5: 15,
  a6: 16,
  a7: 17,
  s2: 18,
  s3: 19,
  s4: 20,
  s5: 21,
  s6: 22,
  s7: 23,
  s8: 24,
  s9: 25,
  s10: 26,
  s11: 27,
  t3: 28,
  t4: 29,
  t5: 30,
  t6: 31,
  x0: 0,
  x1: 1,
  x2: 2,
  x3: 3,
  x4: 4,
  x5: 5,
  x6: 6,
  x7: 7,
  x8: 8,
  x9: 9,
  x10: 0,
  x11: 11,
  x12: 12,
  x13: 13,
  x14: 14,
  x15: 15,
  x16: 16,
  x17: 17,
  x18: 18,
  x19: 19,
  x20: 20,
  x21: 21,
  x22: 22,
  x23: 23,
  x24: 24,
  x25: 25,
  x26: 26,
  x27: 27,
  x28: 28,
  x29: 29,
  x30: 30,
  x31: 31,
};

export class RiscvEmmiter {
  out: string = "";
  nextLine: number = 1;
  instructions: Instruction[] = [];
  dataSection: DataSection = new DataSection();
  labelOffsets: Map<string, number> = new Map();
  textStart: number = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.out = "";
    this.nextLine = 1;
    this.instructions = [];
    this.dataSection = new DataSection();
    this.textStart = 0;
    this.labelOffsets = new Map(); // map label name to program counter position
  }

  startData(dataStart: number) {
    this.emit(".data");
    this.dataSection.dataStart = dataStart;
  }

  startCode() {
    this.emit(".text");
  }

  emit(s: string) {
    this.out += s + "\n";
    this.nextLine = this.nextLine + 1;
  }
  emitIns(instruction: string, comment?: string) {
    if (comment) this.emit("  " + instruction.padEnd(24) + "# " + comment);
    else this.emit("  " + instruction);
  }
  emitComment(comment: string, left: boolean = false) {
    if (left) this.emit(`  # ${comment}`);
    else this.emitIns("", comment);
  }
  emitLocalLabel(label: string, comment?: string) {
    if (comment) this.emit((label + ":").padEnd(24) + "# " + comment);
    else this.emit(label + ":");
    this.labelOffsets.set(label, this.instructions.length * 4);
  }
  emitGlobalLabel(label: string) {
    this.emit(`.globl ${label}`);
  }
  emitGlobalVar(label: string, type: string, value: string) {
    this.emit(`${label}: .${type} "${value}"`);
    switch (type) {
      case "string":
        this.dataSection.pushString(label, value + "\0");
        break;
      default:
        throw Error("non string data items not supported yet");
    }
  }

  addIns(op: string, params: InstructionParameters, meta?: any) {
    this.instructions.push(new Instruction(op, params, meta));
  }

  insMeta(meta: any, asmTxt: string) {
    return { ...meta, asmLine: this.nextLine - 1, asmTxt };
  }

  // Pseudo Instructions --------------------------------------------------

  emitLI(rd: R, imm: number, meta?: any) {
    const asmTxt = `li ${rd}, ${imm}`;
    this.emitIns(asmTxt, meta.brilTxt);
    if (imm > 0b111111111111) {
      // this.addIns("lui", { rd: regNum[rd], imm: getBits(imm, 31, 12) }, this.insMeta(meta, asmTxt));
      this.addIns("lui", { rd: regNum[rd], imm }, this.insMeta(meta, asmTxt));
      this.addIns("addi", { rd: regNum[rd], rs1: regNum[rd], imm: getBits(imm, 11, 0) }, this.insMeta(meta, asmTxt));
    } else {
      this.addIns("addi", { rd: regNum[rd], imm, rs1: 0 }, this.insMeta(meta, asmTxt));
    }
  }
  emitLA(rd: R, label: string, meta?: any) {
    const asmTxt = `la ${rd}, ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("auipc", { rd: regNum[rd], symbol: label, macro: "hi" }, this.insMeta(meta, asmTxt));
    this.addIns("addi", { rd: regNum[rd], rs1: regNum[rd], symbol: label, macro: "lo" }, this.insMeta(meta, asmTxt));
  }
  emitMV(rd: R, rs: R, meta?: any) {
    const asmTxt = `mv ${rd}, ${rs}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("add", { rd: regNum[rd], rs1: regNum[rs], rs2: 0 }, this.insMeta(meta, asmTxt));
  }
  emitJ(label: string, meta?: any) {
    const asmTxt = `j ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("jal", { rd: 0, offset: label }, this.insMeta(meta, asmTxt));
  }
  emitJR(rs: R, meta?: any) {
    const asmTxt = `jr ${rs}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("jalr", { rd: 0, imm: 0, rs1: regNum[rs] }, this.insMeta(meta, asmTxt));
  }
  emitJAL(label: string, meta?: any) {
    const asmTxt = `jal ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("jal", { rd: 1, offset: label }, this.insMeta(meta, asmTxt));
  }
  emitJALR(rs: R, meta?: any) {
    const asmTxt = `jalr ${rs}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("jalr", { rd: 1, rs1: regNum[rs], imm: 0 }, this.insMeta(meta, asmTxt));
  }
  emitNOT(rd: R, rs: R, meta?: any) {
    const asmTxt = `not ${rd}, ${rs}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("xori", { rd: regNum[rd], rs1: regNum[rs], imm: -1 });
  }
  emitRET(meta?: any) {
    const asmTxt = `jr ra`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("jalr", { rd: 0, rs1: 1, imm: 0 }, this.insMeta(meta, asmTxt));
  }
  emitBEQZ(rs: R, label: string, meta?: any) {
    const asmTxt = `beqz ${rs}, ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("beq", { rs1: regNum[rs], rs2: 0, offset: label }), this.insMeta(meta, asmTxt);
  }
  emitBNEZ(rs: R, label: string, meta?: any) {
    const asmTxt = `bnez ${rs}, ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("bne", { rs1: regNum[rs], rs2: 0, offset: label }, this.insMeta(meta, asmTxt));
  }
  emitSEQZ(rd: R, rs: R, meta?: any) {
    const asmTxt = `seqz ${rd}, ${rs}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("sltiu", { rd: regNum[rd], rs1: regNum[rs], imm: 1 }, this.insMeta(meta, asmTxt));
  }

  // I instructions ----------------------------------------------------------------

  emitIType(op: string, rd: R, rs: R, imm: number, meta?: any) {
    const asmTxt = `${op} ${rd}, ${rs}, ${imm}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns(op, { rd: regNum[rd], rs1: regNum[rs], imm: imm >>> 0 }, this.insMeta(meta, asmTxt));
  }

  emitADDI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("addi", rd, rs, imm, meta);
  }
  emitSUBI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("subi", rd, rs, imm, meta);
  }
  emitANDI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("adni", rd, rs, imm, meta);
  }
  emitORI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("ori", rd, rs, imm, meta);
  }
  emitXORI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("xori", rd, rs, imm, meta);
  }
  emitSRAI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("srai", rd, rs, imm, meta);
  }
  emitSLLI(rd: R, rs: R, imm: number, meta?: any) {
    this.emitIType("slli", rd, rs, imm, meta);
  }
  emitLW(rd: R, rs: R, imm: number | null, meta?: any) {
    if (imm == null) this.emitIns(`lw ${rd}, ${rs}`, meta.brilTxt);
    else this.emitIns(`lw ${rd}, ${imm}(${rs})`, meta.brilTxt);
    const asmTxt = `lw ${rd}, ${imm}(${rs})`;
    this.addIns("lw", { rd: regNum[rd], rs1: regNum[rs], imm: imm || 0 }, this.insMeta(meta, asmTxt));
  }

  // R instructions ----------------------------------------------------------------

  emitRType(op: string, rd: R, rs1: R, rs2: R, meta?: any) {
    const asmTxt = `${op} ${rd}, ${rs1}, ${rs2}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns(op, { rd: regNum[rd], rs1: regNum[rs1], rs2: regNum[rs2] }, this.insMeta(meta, asmTxt));
  }

  emitADD(rd: R, rs1: R, rs2: R, meta?: any) {
    this.emitRType("add", rd, rs1, rs2, meta);
  }
  emitSUB(rd: R, rs1: R, rs2: R, meta?: any) {
    this.emitRType("sub", rd, rs1, rs2, meta);
  }
  emitSLT(rd: R, rs1: R, rs2: R, meta?: any) {
    this.emitRType("slt", rd, rs1, rs2, meta);
  }

  // S instructions -----------------------------------------------------------------

  emitSW(rs2: R, rs1: R, imm: number, meta?: any) {
    const asmTxt = `sw ${rs2}, ${imm}(${rs1})`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns("sw", { rs1: regNum[rs1], rs2: regNum[rs2], imm: imm >>> 0 }, this.insMeta(meta, asmTxt));
  }

  // B instructions -----------------------------------------------------------------

  emitBType(op: string, rs1: R, rs2: R, label: string, meta?: any) {
    const asmTxt = `${op} ${rs1}, ${rs2}, ${label}`;
    this.emitIns(asmTxt, meta.brilTxt);
    this.addIns(op, { rs1: regNum[rs1], rs2: regNum[rs2], offset: label }, this.insMeta(meta, asmTxt));
  }

  emitBEQ(rs1: R, rs2: R, label: string, meta?: any) {
    this.emitBType("beq", rs1, rs2, label, meta);
  }
  emitBNE(rs1: R, rs2: R, label: string, meta?: any) {
    this.emitBType("bne", rs1, rs2, label, meta);
  }

  emitECALL(meta?: any) {
    this.emitIns("ecall", meta.brilTxt);
    this.addIns("ecall", { rd: 0, rs1: 0, imm: 0 }, this.insMeta(meta, "ecall"));
  }

  emitSource(src: string) {
    src.split("\n").forEach((line) => this.emitIns(line));
  }
}
