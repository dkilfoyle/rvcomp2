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

  T0 = "t0",
  T1 = "t1",
  T2 = "t2",
  T3 = "t3",
  T4 = "t4",
  T5 = "t5",
  T6 = "t6",

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
}

export class RiscvEmmiter {
  out: string;
  nextLine: number;
  constructor() {
    this.reset();
  }

  reset() {
    this.out = "";
    this.nextLine = 1;
  }
  startData() {
    this.emit(".data");
  }
  startCode() {
    this.emit(".text");
  }

  emit(s: string) {
    this.out += s + "\n";
    this.nextLine = this.nextLine + 1;
  }
  emitIns(instruction: string, comment?: string) {
    if (comment) this.emit("  " + instruction.padEnd(32) + "# " + comment);
    else this.emit("  " + instruction);
  }
  emitComment(comment: string) {
    this.emitIns("", comment);
  }

  emitLocalLabel(label: string, comment?: string) {
    if (comment) this.emit((label + ":").padEnd(34) + "# " + comment);
    else this.emit(label + ":");
  }
  emitGlobalLabel(label: string) {
    this.emit(`.globl ${label}`);
  }

  emitGlobalVar(label: string, type: string, value: string) {
    this.emit(`${label}: .${type} "${value}"`);
  }

  emitLI(rd: R, imm: number, comment?: string) {
    this.emitIns(`li ${rd}, ${imm}`, comment);
  }

  emitMV(rd: R, rs: R, comment?: string) {
    this.emitIns(`mv ${rd}, ${rs}`, comment);
  }

  emitJ(label: string, comment?: string) {
    this.emitIns(`j ${label}`, comment);
  }
  emitJR(rs: R, comment?: string) {
    this.emitIns(`jr ${rs}`, comment);
  }
  emitJAL(label: string, comment?: string) {
    this.emitIns(`jal ${label}`, comment);
  }
  emitJALR(rs: R, comment?: string) {
    this.emitIns(`jalr ${rs}`, comment);
  }

  emitADDI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`addi ${rd}, ${rs}, ${imm}`, comment);
  }
  emitSUBI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`subi ${rd}, ${rs}, ${imm}`, comment);
  }
  emitADD(rd: R, rs1: R, rs2: R, comment?: string) {
    this.emitIns(`add ${rd}, ${rs1}, ${rs2}`, comment);
  }
  emitSUB(rd: R, rs1: R, rs2: R, comment?: string) {
    this.emitIns(`sub ${rd}, ${rs1}, ${rs2}`, comment);
  }

  emitANDI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`andi ${rd}, ${rs}, ${imm}`, comment);
  }
  emitORI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`ori ${rd}, ${rs}, ${imm}`, comment);
  }
  emitXORI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`xori ${rd}, ${rs}, ${imm}`, comment);
  }
  emitSRAI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`srai ${rd}, ${rs}, ${imm}`, comment);
  }
  emitSLLI(rd: R, rs: R, imm: number | string, comment?: string) {
    this.emitIns(`slli ${rd}, ${rs}, ${imm}`, comment);
  }

  emitLW(rd: R, rs: R, imm: number | null, comment?: string) {
    if (imm == null) this.emitIns(`lw ${rd}, ${rs}`, comment);
    else this.emitIns(`lw ${rd}, ${imm}(${rs})`, comment);
  }
  emitSW(rs2: R, rs1: R, imm: number, comment?: string) {
    this.emitIns(`sw ${rs2}, ${imm}(${rs1})`, comment);
  }

  emitLA(rd: R, label: string, comment?: string) {
    this.emitIns(`la ${rd}, ${label}`, comment);
  }

  emitBEQ(rs1: R, rs2: R, label: string, comment?: string) {
    this.emitIns(`beq ${rs1}, ${rs2}, ${label}`, comment);
  }
  emitBNE(rs1: R, rs2: R, label: string, comment?: string) {
    this.emitIns(`bne ${rs1}, ${rs2}, ${label}`, comment);
  }
  emitBEQZ(rs: R, label: string, comment?: string) {
    this.emitIns(`beqz ${rs}, ${label}`, comment);
  }
  emitBNEZ(rs: R, label: string, comment?: string) {
    this.emitIns(`bnez ${rs}, ${label}`, comment);
  }

  emitSEQZ(rd: R, rs: R, comment?: string) {
    this.emitIns(`seqz ${rd}, ${rs}`, comment);
  }
  emitSLT(rd: R, rs1: R, rs2: R, comment?: string) {
    this.emitIns(`slt ${rd}, ${rs1}, ${rs2}`, comment);
  }

  emitNOT(rd: R, rs: R, comment?: string) {
    this.emitIns(`not ${rd}, ${rs}`, comment);
  }

  emitRET(comment?: string) {
    this.emitIns(`jr ra`, comment);
  }

  emitECALL() {
    this.emitIns("ecall");
  }

  emitSource(src: string) {
    src.split("\n").forEach((line) => this.emitIns(line));
  }
}
