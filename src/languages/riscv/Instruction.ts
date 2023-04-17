// 31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00
// {       funct7     } {     rs2    } {     rs1    } {  f3  } {      rd    } {      opcode      }   R Type
// {             imm[11:0]           } {     rs1    } {  f3  } {      rd    } {      opcode      }   I Type
// {     imm[11:5]    } {     rs2    } {     rs1    } {  f3  } {  imm[4:0]  } {      opcode      }   S Type

import _ from "lodash";
import { signedSlice, unsignedSlice, getBits, maskBits } from "./bits";

// Base opcodes.
const OP_LOAD = 0x03;
const OP_IMM = 0x13;
const OP_AUIPC = 0x17;
const OP_STORE = 0x23;
const OP_REG = 0x33;
const OP_LUI = 0x37;
const OP_BRANCH = 0x63;
const OP_JALR = 0x67;
const OP_JAL = 0x6f;
const OP_SYSTEM = 0x73;

// Funct3 opcodes.
const F3_JALR = 0;
const F3_BEQ = 0;
const F3_BNE = 1;
const F3_BLT = 4;
const F3_BGE = 5;
const F3_BLTU = 6;
const F3_BGEU = 7;
const F3_B = 0;
const F3_H = 1;
const F3_W = 2;
const F3_BU = 4;
const F3_HU = 5;
const F3_ADD = 0;
const F3_SL = 1;
const F3_SLT = 2;
const F3_SLTU = 3;
const F3_XOR = 4;
const F3_SR = 5;
const F3_OR = 6;
const F3_AND = 7;
// const F3_MRET = 0;

// Funct7 opcodes.
const F7_L = 0;
const F7_A = 32;
// const F7_MRET = 24;

const OPCODE_TO_FORMAT: Record<number, string> = {
  [OP_REG]: "R",
  [OP_LOAD]: "I",
  [OP_IMM]: "I",
  [OP_JALR]: "I",
  [OP_SYSTEM]: "I",
  [OP_STORE]: "S",
  [OP_BRANCH]: "B",
  [OP_AUIPC]: "U",
  [OP_LUI]: "U",
  [OP_JAL]: "J",
};

// prettier-ignore
export const operations:Record<string, number[]> = {
  //       fmt  opcode     f3   f7
  add:   [OP_REG,    F3_ADD,  F7_L], // __ rd, rs1, rs2
  sub:   [OP_REG,    F3_ADD,  F7_A], // __ rd, rs1, rs2
  sll:   [OP_REG,    F3_SL,   F7_L], // __ rd, rs1, rs2
  slt:   [OP_REG,    F3_SLT,  F7_L], // __ rd, rs1, rs2
  sltu:  [OP_REG,    F3_SLTU, F7_L], // __ rd, rs1, rs2
  xor:   [OP_REG,    F3_XOR,  F7_L], // __ rd, rs1, rs2
  srl:   [OP_REG,    F3_SR,   F7_L], // __ rd, rs1, rs2
  sra:   [OP_REG,    F3_SR,   F7_A], // __ rd, rs1, rs2
  or:    [OP_REG,    F3_OR,   F7_L], // __ rd, rs1, rs2
  and:   [OP_REG,    F3_AND,  F7_L], // __ rd, rs1, rs2

  addi:  [OP_IMM,    F3_ADD       ], // __ rd, rs1, imm
  xori:  [OP_IMM,    F3_XOR       ], // __ rd, rs1, imm
  ori:   [OP_IMM,    F3_OR        ], // __ rd, rs1, imm
  andi:  [OP_IMM,    F3_AND       ], // __ rd, rs1, imm
  slli:  [OP_IMM,    F3_SL,   F7_L], // __ rd, rs1, imm
  srli:  [OP_IMM,    F3_SR,   F7_L], // __ rd, rs1, imm
  srai:  [OP_IMM,    F3_SR,   F7_A], // __ rd, rs1, imm
  slti:  [OP_IMM,    F3_SLT       ], // __ rd, rs1, imm
  sltiu: [OP_IMM,    F3_SLTU      ], // __ rd, rs1, imm

  lb:    [OP_LOAD,   F3_B         ], // l__ rd, rs1, imm
  lh:    [OP_LOAD,   F3_H         ], // l__ rd, rs1, imm
  lw:    [OP_LOAD,   F3_W         ], // l__ rd, rs1, imm
  lbu:   [OP_LOAD,   F3_BU        ], // l__ rd, rs1, imm
  lhu:   [OP_LOAD,   F3_HU        ], // l__ rd, rs1, imm
  
  sb:    [OP_STORE,  F3_B         ], // s_  rs1, rs2, imm
  sh:    [OP_STORE,  F3_H         ], // s_  rs1, rs2, imm
  sw:    [OP_STORE,  F3_W         ], // s_  rs1, rs2, imm
  
  beq:   [OP_BRANCH, F3_BEQ       ], // b__ rs1, rs2, imm
  bne:   [OP_BRANCH, F3_BNE       ], // b__ rs1, rs2, imm
  blt:   [OP_BRANCH, F3_BLT       ], // b__ rs1, rs2, imm
  bge:   [OP_BRANCH, F3_BGE       ], // b__ rs1, rs2, imm
  bltu:  [OP_BRANCH, F3_BLTU      ], // b__ rs1, rs2, imm
  bgeu:  [OP_BRANCH, F3_BGEU      ], // b__ rs1, rs2, imm
  
  jal:   [OP_JAL                  ], // jal rd, imm
  jalr:  [OP_JALR,   F3_JALR      ], // jalr rd, rs1, imm
  lui:   [OP_LUI                  ],
  auipc: [OP_AUIPC                ],
  ecall: [OP_SYSTEM, 0x0          ],
};

interface IFields {
  opcode?: number;
  funct3?: number;
  funct7?: number;
  rs2?: number;
  rs1?: number;
  rd?: number;
}

// Reverse INSTR_NAME_TO_FIELDS into a tree to decode field values.
// Use hash maps instead of plain objects to avoid converting numeric keys
// to strings.
function addToTree(tree: Map<any, any>, name: string, path: number[], index: number) {
  const fieldValue = path[index];
  if (index === path.length - 1) {
    tree.set(fieldValue, name);
  } else {
    if (!tree.has(fieldValue)) {
      tree.set(fieldValue, new Map<string, string>());
    }
    addToTree(tree.get(fieldValue), name, path, index + 1);
  }
}

export const fieldTree = new Map();
for (let [name, path] of Object.entries(operations)) {
  addToTree(fieldTree, name, path, 0);
}

// prettier-ignore
const FORMAT_TO_IMM_SLICES:Record<string, number[][]> = {
    I : [[31, 20, 0 ]                                         ],
    S : [[31, 25, 5 ], [11, 7, 0  ]                           ],
    B : [[31, 31, 12], [7 , 7, 11 ], [30, 25, 5 ], [11, 8 , 1]],
    U : [[31, 12, 12]                                         ],
    J : [[31, 31, 20], [19, 12, 12], [20, 20, 11], [30, 21, 1]],
};

function decodeImmediate({ opcode, funct3, rs2 }: IFields, format: InstructionType, word: number) {
  if (opcode === OP_IMM && (funct3 === F3_SL || funct3 === F3_SR)) {
    return rs2;
  }

  if (!(format in FORMAT_TO_IMM_SLICES)) {
    return 0;
  }

  const slices = FORMAT_TO_IMM_SLICES[format];

  let slicer = signedSlice;
  let res = 0;
  for (let [left, right, pos] of slices) {
    res |= slicer(word, left, right, pos);
    slicer = unsignedSlice;
  }

  return res;
}

//prettier-ignore
export const instructionFields: Record<string, [number, number?]> = {
  all:        [31,  0],
  opcode:     [6,   0],
  funct3:     [14, 12],
  funct5:     [13, 27],
  funct7:     [31, 25],
  rd:         [11,  7],
  rs1:        [19, 15],
  rs2:        [24, 20],
  rs3:        [31, 27],
  imm_11_0:   [31, 20],
  imm_4_0:    [11,  7],
  imm_11_5:   [31, 25],
  imm_11b:    [7     ],
  imm_4_1:    [11,  8],
  imm_10_5:   [30, 25],
  imm_12:     [31    ],
  imm_31_12:  [31, 12],
  imm_19_12:  [19, 12],
  imm_11j:    [20    ],
  imm_10_1:   [30, 21],
  imm_20:     [31    ],
};

export const instructionFormats = {
  R: ["funct7", "rs2", "rs1", "funct3", "rd", "opcode"],
  I: ["imm_11_0", "rs1", "funct3", "rd", "opcode"],
  U: ["imm_31_12", "rd", "opcode"],
  S: ["imm_11_5", "rs2", "rs1", "funct3", "imm_4_0", "opcode"],
  B: ["imm_12", "imm_10_5", "rs2", "rs1", "funct3", "imm_4_1", "imm_11b", "opcode"],
  J: ["imm_20", "imm_10_1", "imm_11j", "imm_19_12", "rd", "opcode"],
};

type InstructionType = "I" | "R" | "S" | "B" | "J" | "U";

export interface InstructionParameters {
  rs1?: number;
  rs2?: number;
  rd?: number;
  imm?: number;
  offset?: number | string;
  symbol?: string;
  macro?: "hi" | "lo";
}

export class Instruction {
  iType: InstructionType;
  opName: string;
  params: InstructionParameters;
  machineCode: number;
  meta: any;

  constructor(opName: string, params: InstructionParameters, meta: any) {
    this.iType = OPCODE_TO_FORMAT[operations[opName][0]] as InstructionType;
    this.opName = opName;
    this.params = params;
    this.machineCode = 0;
    this.meta = meta;
  }

  encode(address: number, symbols: Map<string, number>) {
    // address is address of this instruction, used to calculated relative offsets

    // convert string offset to immediate offset relative to PC(address)
    if (typeof this.params.offset == "string") {
      const labelOffset = symbols.get(this.params.offset);
      if (_.isUndefined(labelOffset)) throw Error();
      this.params.imm = labelOffset - address;
    }

    if (this.params.symbol) {
      const symbolOffset = symbols.get(this.params.symbol);
      if (_.isUndefined(symbolOffset)) throw Error();
      this.params.imm = symbolOffset - (address - 4); // = symbol - PC
    }

    if (this.params.macro === "hi") {
      if (!this.params.imm) throw Error();
      this.params.imm = ((this.params.imm >>> 12) + getBits(this.params.imm, 12, 11)) << 12;
      // la rd, symbol =>
      // auipc rd, delta[31:12] + delta[11] where delta = symbol - PC
      // addi rd, rd, delta[11:0]
    }

    const setCode = (code: number, field: string, value: number) => {
      const [lo, mask] = maskBits(...instructionFields[field]);
      return (code & ~(mask << lo)) | ((value & mask) << lo);
    };

    const [opcode, funct3, funct7] = operations[this.opName];

    let code = 0;

    code = setCode(code, "opcode", opcode);
    switch (this.iType) {
      case "I":
        if (_.isUndefined(this.params.rd)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs1)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.imm)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "funct3", funct3);
        code = setCode(code, "rd", this.params.rd);
        code = setCode(code, "rs1", this.params.rs1);
        code = setCode(code, "imm_11_0", this.params.imm);
        break;
      case "R":
        if (_.isUndefined(this.params.rd)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs1)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs2)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "funct3", funct3);
        code = setCode(code, "funct7", funct7);
        code = setCode(code, "rd", this.params.rd);
        code = setCode(code, "rs1", this.params.rs1);
        code = setCode(code, "rs2", this.params.rs2);
        break;
      case "S":
        if (_.isUndefined(this.params.imm)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs1)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs2)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "funct3", funct3);
        code = setCode(code, "rs1", this.params.rs1);
        code = setCode(code, "rs2", this.params.rs2);
        code = setCode(code, "imm_4_0", this.params.imm);
        code = setCode(code, "imm_11_5", this.params.imm >>> 5);
        break;
      case "B":
        if (_.isUndefined(this.params.imm)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs1)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.rs2)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "funct3", funct3);
        code = setCode(code, "rs1", this.params.rs1);
        code = setCode(code, "rs2", this.params.rs2);
        code = setCode(code, "imm_11b", this.params.imm >>> 11);
        code = setCode(code, "imm_4_1", this.params.imm >>> 1);
        code = setCode(code, "imm_10_5", this.params.imm >>> 5);
        code = setCode(code, "imm_12", this.params.imm >>> 12);
        break;
      case "J":
        if (_.isUndefined(this.params.rd)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.imm)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "rd", this.params.rd);
        code = setCode(code, "imm_19_12", this.params.imm >>> 12);
        code = setCode(code, "imm_11j", this.params.imm >>> 11);
        code = setCode(code, "imm_10_1", this.params.imm >>> 1);
        code = setCode(code, "imm_20", this.params.imm >>> 20);
        break;
      case "U":
        if (_.isUndefined(this.params.rd)) {
          debugger;
          throw Error("instruction param undefined");
        }
        if (_.isUndefined(this.params.imm)) {
          debugger;
          throw Error("instruction param undefined");
        }
        code = setCode(code, "rd", this.params.rd);
        code = setCode(code, "imm_31_12", this.params.imm >>> 12);
        break;
      default:
        throw new Error();
    }
    this.machineCode = code >>> 0;
    return this.machineCode;
  }

  static Decode(x: number, meta: any) {
    const fields = {
      opcode: unsignedSlice(x, 6, 0),
      funct3: unsignedSlice(x, 14, 12),
      funct7: unsignedSlice(x, 31, 25),
      rs2: unsignedSlice(x, 24, 20),
      rs1: unsignedSlice(x, 19, 15),
      rd: unsignedSlice(x, 11, 7),
    };

    let tree = fieldTree;
    for (let fieldValue of Object.values(fields)) {
      tree = tree.get(fieldValue) || "invalid";
      if (!(tree instanceof Map)) {
        break;
      }
    }

    const opName = tree as unknown as string;
    const format = OPCODE_TO_FORMAT[fields.opcode] as InstructionType;

    const result = new Instruction(opName, { ...fields, imm: decodeImmediate(fields, format, x) }, meta);
    result.machineCode = x;
    return result;
  }

  formatMachineCode() {
    return "0x" + this.machineCode.toString(16).padStart(8, "0");
  }

  getFields() {
    let x = this.machineCode;
    let slice = unsignedSlice;
    switch (this.iType) {
      case "R":
        return [slice(x, 31, 25), slice(x, 24, 20), slice(x, 19, 15), slice(x, 14, 12), slice(x, 11, 7), slice(x, 6, 0)];
    }
  }

  formatInstruction() {
    const xs = this.machineCode.toString(2).padStart(32, "0");
    switch (this.iType) {
      case "R":
      case "S":
      case "B":
        return (
          xs.slice(31 - 31, 31 - 25 + 1) +
          "_" +
          xs.slice(31 - 24, 31 - 20 + 1) +
          "_" +
          xs.slice(31 - 19, 31 - 15 + 1) +
          "_" +
          xs.slice(31 - 14, 31 - 12 + 1) +
          "_" +
          xs.slice(31 - 11, 31 - 7 + 1) +
          "_" +
          xs.slice(31 - 6, 31 - 0 + 1)
        );
      case "I":
        return (
          xs.slice(31 - 31, 31 - 20 + 1) +
          "_" +
          xs.slice(31 - 19, 31 - 15 + 1) +
          "_" +
          xs.slice(31 - 14, 31 - 12 + 1) +
          "_" +
          xs.slice(31 - 11, 31 - 7 + 1) +
          "_" +
          xs.slice(31 - 6, 31 - 0 + 1)
        );
      case "J":
      case "U":
        return xs.slice(31 - 31, 31 - 12 + 1) + "_" + xs.slice(31 - 11, 31 - 7 + 1) + "_" + xs.slice(31 - 6, 31 - 0 + 1);
      default:
        throw new Error();
    }
  }
}
