// adapted from:
// https://github.com/andrescv/jupiter

import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { AbstractParseTreeVisitor } from "antlr4ts/tree/AbstractParseTreeVisitor";
import {
  BtypeContext,
  DataContext,
  EnvironmentContext,
  GlobalContext,
  ItypeContext,
  JtypeContext,
  LabelContext,
  PseudoContext,
  RtypeContext,
  StypeContext,
  UtypeContext,
} from "./antlr/SimpleASMParser";
import { SimpleASMVisitor } from "./antlr/SimpleASMVisitor";
import { getBits } from "../../../utils/bits";
import { Instruction } from "../Instruction";
import { ParseTree } from "antlr4ts/tree/ParseTree";
import { DocPosition } from "../../../utils/antlr";
import { ASMRootNode, DataSection } from "../astNodes";
import { AstBuildResult } from "../../simpleC/parser/astBuilder";

export const registerNumbers = {
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

export const registerNames = Object.keys(registerNumbers);

// prettier-ignore
const pseudos = {
  nop:    {name: "addi",  rd: 0, rs1: 0,         imm: 0 },
  li:     {name: "addi",         rs1: 0                 },
  mv:     {name: "addi",                         imm: 0 },
  not:    {name: "xori",                         imm: -1},
  neg:    {name: "sub",          rs1: 0                 },
  seqz:   {name: "sltiu",                        imm: 1 },
  snez:   {name: "sltu",         rs1: 0                 },
  sgtz:   {name: "slt",          rs1: 0                 },
  sltz:   {name: "slt",                  rs2: 0         },
  beqz:   {name: "beq",                  rs2: 0         },
  bnez:   {name: "bne",                  rs2: 0         },
  blez:   {name: "bge",          rs1: 0                 },
  bgez:   {name: "bge",                  rs2: 0         },
  bltz:   {name: "blt",                  rs2: 0         },
  bgtz:   {name: "blt",          rs1: 0                 },
  bgtu:   {name: "bltu",  rev_rs: true                  },
  j:      {name: "jal",   rd: 0                         },
  jr:     {name: "jalr",  rd: 0,                 imm: 0 },
  jal:    {name: "jal",   rd: 1                         },
  jalr:   {name: "jalr",  rd: 1,                 imm: 0 },
  ret:    {name: "jalr",  rd: 0, rs1: 1,         imm: 0 },
  call:   {name: "jalr",  rd: 1, rs1: 1,                },
}

export type SymbolTable = { [index: string]: number };

export class SimpleASMAstBuilder extends AbstractParseTreeVisitor<ASMRootNode> implements SimpleASMVisitor<void> {
  // textBytes: ArrayBuffer;
  // textView: DataView;
  instructions!: Instruction[];
  labels!: SymbolTable;
  symbols!: SymbolTable;
  globals!: string[];
  dataSection!: DataSection;

  constructor() {
    super();
    this.reset();
  }

  reset() {
    // this.textBytes = new ArrayBuffer(1000);
    // this.textView = new DataView(this.params.textBytes);
    this.instructions = new Array<Instruction>();
    this.labels = {};
    this.symbols = {};
    this.globals = [];
    this.dataSection = new DataSection();
  }

  protected defaultResult() {
    return {
      instructions: [],
      symbols: {},
      labels: {},
      dataSection: new DataSection(),
      globals: [],
    };
  }

  visitTree(tree: ParseTree): AstBuildResult {
    tree.accept(this);
    return {
      root: {
        instructions: this.instructions,
        dataSection: this.dataSection,
        labels: this.labels,
        symbols: this.symbols,
        globals: this.globals,
      },
      errors: [],
    };
  }

  visitLabel(ctx: LabelContext) {
    const label = ctx.ID().text;
    this.labels[label] = this.instructions.length * 4;
  }

  getPos(ctx: ParserRuleContext): DocPosition {
    return {
      startLine: ctx.start.line,
      startCol: ctx.start.charPositionInLine,
      endLine: ctx.stop.line,
      endCol: ctx.stop.charPositionInLine,
    };
  }

  visitData(ctx: DataContext) {
    const name = ctx._name.text;
    const type = ctx._type.text;
    let str = ctx.String().text;
    str = str.slice(1, str.length - 1); // strip ""
    this.symbols[name] = this.dataSection.pointer;
    switch (type) {
      case ".string":
      case ".ascii":
        this.dataSection.pushString(str);
        break;
      case ".asciiz": {
        this.dataSection.pushString(str + "\0");
        break;
      }
      case ".byte":
        this.dataSection.pushByte(parseInt(str));
        break;
      case ".word":
        this.dataSection.pushWord(parseInt(str));
        break;
      default:
        throw new Error();
    }
  }

  visitEnvironment(ctx: EnvironmentContext) {
    this.instructions.push(new Instruction("ecall", {}, this.getPos(ctx)));
  }

  visitItype(ctx: ItypeContext) {
    const rd = parseInt(registerNumbers[ctx._rd.text]);
    const rs1 = parseInt(registerNumbers[ctx._rs1.text]);
    const imm = parseInt(ctx.immediate().text) >>> 0;
    this.instructions.push(new Instruction(ctx._op.text, { rd, rs1, imm }, this.getPos(ctx)));
  }

  visitRtype(ctx: RtypeContext) {
    const rd = parseInt(registerNumbers[ctx._rd.text]);
    const rs1 = parseInt(registerNumbers[ctx._rs1.text]);
    const rs2 = parseInt(registerNumbers[ctx._rs2.text]);
    this.instructions.push(new Instruction(ctx._op.text, { rs1, rs2, rd }, this.getPos(ctx)));
  }

  visitStype(ctx: StypeContext) {
    const rs1 = parseInt(registerNumbers[ctx._rs1.text]);
    const rs2 = parseInt(registerNumbers[ctx._rs2.text]);
    const imm = parseInt(ctx.immediate().text) >>> 0;
    this.instructions.push(new Instruction(ctx._op.text, { imm, rs1, rs2 }, this.getPos(ctx)));
  }

  visitBtype(ctx: BtypeContext) {
    const rs1 = parseInt(registerNumbers[ctx._rs1.text]);
    const rs2 = parseInt(registerNumbers[ctx._rs2.text]);
    const label = ctx.ID().text;
    this.instructions.push(new Instruction(ctx._op.text, { offset: label, rs1, rs2 }, this.getPos(ctx)));
  }

  visitJtype(ctx: JtypeContext) {
    const rd = parseInt(registerNumbers[ctx._rd.text]);
    const imm = parseInt(ctx.immediate().text);
    this.instructions.push(new Instruction(ctx._op.text, { rd, imm }, this.getPos(ctx)));
  }

  visitUtype(ctx: UtypeContext) {
    const rd = parseInt(registerNumbers[ctx._rd.text]);
    const imm = parseInt(ctx.immediate().text) >>> 0;
    this.instructions.push(new Instruction(ctx._op.text, { rd, imm }, this.getPos(ctx)));
  }

  visitPseudo(ctx: PseudoContext) {
    const op = ctx._op.text;
    const rs1 = ctx._rs1 ? parseInt(registerNumbers[ctx._rs1.text]) : undefined;
    const rs2 = ctx._rs2 ? parseInt(registerNumbers[ctx._rs2.text]) : undefined;
    const rd = ctx._rd ? parseInt(registerNumbers[ctx._rd.text]) : undefined;
    const imm = ctx.immediate() ? parseInt(ctx.immediate().text) : undefined;
    const offset = ctx.offset() ? ctx.offset().text : undefined;
    const symbol = ctx._symbol ? ctx._symbol.text : undefined;

    if (op === "la") {
      this.instructions.push(new Instruction("auipc", { rd, symbol, macro: "hi" }, this.getPos(ctx)));
      this.instructions.push(new Instruction("addi", { rd, rs1: rd, symbol, macro: "lo" }, this.getPos(ctx)));
      return;
    }

    if (op === "li" && imm > 0b111111111111) {
      this.instructions.push(new Instruction("lui", { rd, imm: getBits(imm, 31, 12) }, this.getPos(ctx)));
      this.instructions.push(new Instruction("addi", { rd, rs1: rd, imm: getBits(imm, 11, 0) }, this.getPos(ctx)));
      return;
    }

    let params = {};
    let pop = "";

    switch (op) {
      case "beqz":
        pop = "beq";
        params = { rs1, rs2: 0, offset };
        break;
      case "bnez":
        pop = "bne";
        params = { rs1, rs2: 0, offset };
        break;
      case "blez":
        pop = "bge";
        params = { rs1: 0, rs2: rs1, offset };
        break;
      case "bgez":
        pop = "bge";
        params = { rs1, rs2: 0, offset };
        break;
      case "bltz":
        pop = "blt";
        params = { rs1, rs2: 0, offset };
        break;
      case "bgtz":
        pop = "blt";
        params = { rs1: 0, rs2: rs1, offset };
        break;
      case "bgt":
        pop = "blt";
        params = { rs1: rs2, rs2: rs1, offset };
        break;
      case "ble":
        pop = "bge";
        params = { rs1: rs2, rs2: rs1, offset };
        break;
      case "bgtu":
        pop = "bltu";
        params = { rs1: rs2, rs2: rs1, offset };
        break;
      case "bleu":
        pop = "bgeu";
        params = { rs1: rs2, rs2: rs1, offset };
        break;
      // load pseudo-instructions
      case "mv":
        pop = "addi";
        params = { rd, rs1, imm: 0 };
        break;
      case "li":
        pop = "addi";
        params = { rd, rs1: 0, imm };
        break;
      // set pseudos
      case "seqz":
        pop = "sltiu";
        params = { rd, rs1, imm: 1 };
        break;
      case "snez":
        pop = "sltu";
        params = { rd, rs1: 0, rs: rs1 };
        break;
      case "sltz":
        pop = "slt";
        params = { rd, rs1, rs2: 0 };
        break;
      case "sgtz":
        pop = "slt";
        params = { rd, rs1: 0, rs2: rs1 };
        break;
      // logical pseudos
      case "not":
        pop = "xori";
        params = { rd, rs1, imm: -1 };
        break;
      case "neg":
        pop = "sub";
        params = { rd, rs1: 0, rs2: rs1 };
        break;
      // jump pseudos
      case "ret":
        pop = "jalr";
        params = { rd: 0, rs1: 1, imm: 0 };
        break;
      case "call":
        pop = "jalr";
        params = { rd: 1, rs1: 1, offset };
        break;
      case "j":
        pop = "jal";
        params = { rd: 0, offset };
        break;
      case "jr":
        pop = "jalr";
        params = { rd: 0, rs1, imm: 0 };
        break;
      case "jal":
        pop = "jal";
        params = { rd: 1, offset };
        break;
      default:
        debugger;
    }
    this.instructions.push(new Instruction(pop, params, this.getPos(ctx)));
  }

  visitGlobal(ctx: GlobalContext) {
    this.globals.push(ctx.ID().text);
  }
}
