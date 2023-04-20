// adapted from Chocopy

import _ from "lodash";
import {
  IBrilConst,
  IBrilEffectOperation,
  IBrilFunction,
  IBrilInstructionOrLabel,
  IBrilLabel,
  IBrilProgram,
  IBrilValueInstruction,
  IBrilValueOperation,
} from "../bril/BrilInterface";
import { brilPrinter } from "../bril/BrilPrinter";
import { IRegisterAllocation } from "../bril/registers";
import { R, RiscvEmmiter } from "./emitter";
import { LocalScope, LocalScopeStack, LocalVariable } from "./LocalScope";
import { cfgBuilder } from "../bril/cfg";

// ABI
// caller:
//   copy arguments to A registers
//   call subFunction
// callee:
//   prolog
//      reserve enough stack for AR and any local variables pushed to stack
//      save caller FP and RA onto stack
//      save any used S and A registers onto stack
//   body
//      if leaf function then preferentially use T registers, else use S registers
//   epilog
//      restore any used S and A registers
//

// Optimisations?
// 1. for leaf functions (do not call other functions) pass parameters as registers and no prolog/epilog
//

export const WORD_SIZE = 4;

interface GlobalVar {
  label: string;
  type: string;
  value: string;
}

// export class CompilerError {
//   pos: DocPosition;
//   msg: string;
//   constructor(pos: DocPosition, msg: string) {
//     this.pos = pos;
//     this.msg = msg;
//   }
// }

class RiscvCodeGenerator {
  emitter: RiscvEmmiter;
  labelCount: number = 0;
  scopeStack: LocalScopeStack;
  bril: IBrilProgram | undefined;
  currentFunction: IBrilFunction | undefined;
  registerAllocation: IRegisterAllocation;
  textStart = 0;
  dataStart = 0;

  constructor() {
    this.emitter = new RiscvEmmiter();
    this.scopeStack = new LocalScopeStack();
    this.currentFunction = undefined;
    this.registerAllocation = { graph: {}, coloring: {} };
    this.reset({ graph: {}, coloring: {} });
  }

  reset(registerAllocation: IRegisterAllocation) {
    this.emitter.reset();
    this.scopeStack.reset();
    this.labelCount = 0;
    this.currentFunction = undefined;
    this.registerAllocation = registerAllocation;
  }

  newLabel(stub: string = "") {
    this.labelCount = this.labelCount + 1;
    return stub + this.labelCount;
  }

  // RiscV convention
  // Stack grows downwards (smaller memory addresses)
  // Stack pointer is full (points to the last occupied slot)

  pushStack(rs: R, comment?: string) {
    this.emitter.emitADDI(R.SP, R.SP, -4, { brilTxt: "grow stack" });
    this.emitter.emitSW(rs, R.SP, 0, { brilTxt: comment });
  }

  popStack(rd: R, comment: string = `pop top of stack to X${rd}`) {
    this.emitter.emitLW(rd, R.SP, 0, { brilTxt: comment });
    this.emitter.emitADDI(R.SP, R.SP, 4, { brilTxt: "shrink stack" });
  }

  getRegister(variableName: string) {
    if (_.isUndefined(this.registerAllocation.coloring)) {
      debugger;
      throw Error("Spilling not implemented yet");
    }
    if (!(this.currentFunction && this.currentFunction.name in this.registerAllocation.coloring)) {
      debugger;
      throw Error(`Can't map ${variableName} to register`);
    }
    const reg = this.registerAllocation.coloring![this.currentFunction.name]![variableName];
    if (!(reg && reg in R)) {
      // debugger;
      throw Error(`unable to get register for variable ${variableName}`);
    }
    return reg as R;
  }

  generate(bril: IBrilProgram, registerAllocation: IRegisterAllocation) {
    this.reset(registerAllocation);
    this.bril = bril;

    if (Object.keys(bril.functions).length == 0) {
      throw new Error("Empty bril");
    }

    this.emitter.startCode();
    this.emitter.emitGlobalLabel("main");
    this.emitter.emitLocalLabel("_start");
    this.emitter.emitLI(R.SP, 4096, { brilTxt: "init stack pointer to top of memory" });

    this.textStart = 0;
    Object.values(bril.functions).forEach((func) => this.generateFunction(func));

    this.dataStart = this.emitter.instructions.length * 4;
    this.emitter.startData(this.dataStart);

    Array.from(bril.data).forEach(([symbolName, symbolData]) => {
      this.emitter.emitGlobalVar(symbolName, symbolData.type, symbolData.value);
    });

    const symbolTable = new Map<string, number>([...this.emitter.dataSection.offsets, ...this.emitter.labelOffsets]);
    const memWords: number[] = [];
    this.emitter.instructions.forEach((ins, i) => {
      memWords.push(ins.encode(this.textStart + i * 4, symbolTable));
    });

    memWords.push(...this.emitter.dataSection.getWords());

    const metas = new Map<number, any>();
    this.emitter.instructions.forEach((instr, i) => {
      metas.set(i * 4, instr.meta);
    });

    return {
      asm: this.emitter.out,
      memWords,
      symbolTable,
      textStart: this.textStart,
      dataStart: this.dataStart,
      heapStart: this.dataStart + this.emitter.dataSection.pointer,
      metas,
    };
  }

  generateFunction(func: IBrilFunction) {
    const asmFunctionStartLine = this.emitter.nextLine;

    // add a new scope for the function. SP starts at -WORD_SIZE to accomodate saved FP and RA
    const scope = this.scopeStack.enterFunction(func.name);
    if (!scope.context) throw Error("No scope context");
    //console.log(`Entering function ${func.name} scope: FP=${scope.context.FP}, initSP=${scope.context.SP}`);
    this.currentFunction = func;

    const meta = (comment: string, i: number) => {
      return {
        brilFunctionName: this.currentFunction!.name,
        brilInstrNum: i,
        brilTxt: comment,
      };
    };

    const generateProlog = () => {
      // add function parameters to function scope
      this.scopeStack.pushFunctionParams(func);

      this.emitter.emitLocalLabel(func.name + ".prolog");
      this.currentFunction = func;

      // preface: the caller will have resulted in state
      // Arg1  <--- Caller FP
      // ....
      // Arg3
      // Arg2
      // Arg1  <--- SP

      // prolog: now becomes
      // Arg1  <--- old SP             ====> new FP (args will be at 0(FP), 4(FP), 8(FP)... )
      // RA
      // Caller FP = dynamic link      ====> new SP
      if (!scope.context) throw Error("invalid scope");
      this.emitter.emitADDI(R.SP, R.SP, scope.context.SP, meta("Make space for start of AR", 0));
      this.emitter.emitSW(R.FP, R.SP, 0, meta("Save caller's FP", 0));
      this.emitter.emitSW(R.RA, R.SP, WORD_SIZE, meta("Save caller's RA", 0));
      this.emitter.emitADDI(R.FP, R.SP, 2 * WORD_SIZE, meta("New FP is at old SP", 0));
    };

    if (!(func.name === "main")) generateProlog();

    const asmBodyStartLine = this.emitter.nextLine;
    this.emitter.emitComment(`${func.name} body`);

    this.generateInstructions(func.instrs, `${func.name} body`);

    const asmEpilogStartLine = this.emitter.nextLine;
    const lastInstr = func.instrs.length - 1;
    this.emitter.emitComment(`${func.name} epilogue`);
    if (func.name === "main") {
      this.emitter.emitLI(R.A0, 10, meta("Set A0 to 10 for exit ecall", lastInstr));
      this.emitter.emitECALL({ brilTxt: "end main" });
    } else {
      // Epilog
      this.emitter.emitLW(R.RA, R.FP, -1 * WORD_SIZE, meta("load saved RA", lastInstr));
      this.emitter.emitMV(R.T0, R.FP, meta("temp current FP (also = old SP)", lastInstr));
      this.emitter.emitLW(R.FP, R.FP, -2 * WORD_SIZE, meta("restore callers FP", lastInstr));
      this.emitter.emitMV(R.SP, R.T0, meta("restore caller's SP, deleting the callee AR", lastInstr));
      this.emitter.emitJR(R.RA, meta("jump back to caller (RA)", lastInstr));
    }
  }

  generateInstructions(instrs: IBrilInstructionOrLabel[], label: string) {
    instrs.forEach((instr, i) => {
      let ins;
      const meta = (brilTxt: string) => ({ brilFunctionName: this.currentFunction!.name, brilInstrNum: i, brilTxt });
      if ("label" in instr) {
        ins = instr as IBrilLabel;
        this.emitter.emitLocalLabel(ins.label);
      } else if ("op" in instr) {
        const insText = brilPrinter.formatInstruction(instr, 0, false);
        let binOpFn;
        switch (instr.op) {
          case "const":
            ins = instr as IBrilConst;
            // todo;
            if (typeof ins.type == "object" && "ptr" in ins.type) {
              // const ptr
              if (typeof ins.value == "string") {
                if (!ins.value.startsWith("@")) throw Error(`const ptr value ${ins.value} is a string but does not start with @`);
                const address = this.bril?.data.get(ins.value);
                if (!address) throw Error("str ptr not found");
                this.emitter.emitLA(this.getRegister(ins.dest), address.name, meta(insText));
              } else throw Error(`Unsupported ptr value type ${typeof ins.value}`);
            } else if (ins.type == "int") {
              this.emitter.emitLI(this.getRegister(ins.dest), ins.value as number, meta(insText));
            } else throw Error("unsupported const type");
            break;
          case "br":
            ins = instr as IBrilEffectOperation;
            if (!ins.args || !ins.labels) throw new Error("Branch instruction missing args - badly formed bril");
            this.emitter.emitBNEZ(this.getRegister(ins.args[0]), ins.labels[0], meta(insText));
            if (ins.labels[1]) this.emitter.emitJ(ins.labels[1], meta(insText));
            break;
          // integer binary numeric operations
          case "add":
          case "sub":
          case "mul":
          case "div":
          case "mod":
          case "gt":
          case "lt":
            ins = instr as IBrilValueOperation;
            if (!ins.args) throw new Error("Branch instruction missing args - badly formed bril");
            const rd = this.getRegister(ins.dest);
            const rs1 = this.getRegister(ins.args[0]);
            const rs2 = this.getRegister(ins.args[1]);
            switch (ins.op) {
              case "add":
                this.emitter.emitADD(rd, rs1, rs2, meta(insText));
                break;
              case "sub":
                this.emitter.emitSUB(rd, rs1, rs2, meta(insText));
                break;
              case "gt":
                this.emitter.emitSLT(rd, rs2, rs1, meta(insText));
                break;
              case "lt":
                this.emitter.emitSLT(rd, rs1, rs2, meta(insText));
                break;
              default:
                throw Error(`${instr.op} not yet implemented in RiscV code generator`);
            }
            break;
          case "jmp":
            ins = instr as IBrilEffectOperation;
            if (!ins.labels) throw new Error("Branch instruction missing args - badly formed bril");
            this.emitter.emitJ(ins.labels[0], meta(insText));
            break;
          case "call":
            ins = instr as IBrilEffectOperation;
            if (!ins.funcs) throw new Error("call instruction missing funcs");
            if (!ins.args) throw new Error("call instruction missing args");
            if (ins.funcs[0] == "print_int") {
              this.emitter.emitLI(R.A0, 1, meta(insText));
              this.emitter.emitMV(R.A1, this.getRegister(ins.args[0]), meta(insText));
              this.emitter.emitECALL(meta(insText));
            }
            if (ins.funcs[0] == "print_string") {
              this.emitter.emitLI(R.A0, 4, meta(insText));
              this.emitter.emitMV(R.A1, this.getRegister(ins.args[0]), meta(insText));
              this.emitter.emitECALL(meta(insText));
            }
          case "ret":
            {
              ins = instr as IBrilEffectOperation;
              if (ins.args?.length) {
                const rs1 = this.getRegister(ins.args[0]);
                this.emitter.emitMV(R.A0, rs1, meta(insText));
              }
            }
            break;

          default:
            throw Error(`${instr.op} not implemented yet in brilToRiscV`);
        }
      }
    });
  }

  encode() {
    return [];
  }

  // visitFunctionCall(node: AstFunctionCall) {
  //   if (node.funDecl.id === "print_int") {
  //     const startLine = this.emitter.nextLine;
  //     this.visitExpression(node.params[0]);
  //     this.emitter.emitMV(R.A1, R.A0, "Move A0 to A1 to be argument for print_int ecall");
  //     this.emitter.emitLI(R.A0, 1, "print_int ecall");
  //     this.emitter.emitECALL();
  //     this.rangeMap.push({
  //       left: { ...node.pos, col: "red" },
  //       right: { startLine, endLine: this.emitter.nextLine - 1, col: "blue" },
  //     });
  //     return;
  //   }

  //   if (node.funDecl.id === "print_string") {
  //     this.visitExpression(node.params[0]);
  //     this.emitter.emitMV(R.A1, R.A0, "Move A0 to A1 to be argument for print_string ecall");
  //     this.emitter.emitLI(R.A0, 4, "print_string ecall");
  //     this.emitter.emitECALL();
  //     return;
  //   }

  //   this.emitter.emitComment(`call ${node.toCode()}`);

  //   //  AR Start:   Caller's FP   } Set by caller
  //   //              A3            } "
  //   //              A2            } "
  //   //    FP -->    A1            } "
  //   //              RA            ] Set by callee (RA is not set until after JAL)
  //   //    SP -->    Caller FP     ] "

  //   // Function argument[n] can be retrieved from (4*(n+1))(FP)
  //   // eg LW a0, 4(FP) => a0 = arg[0]

  //   // push params onto AR in reverse order
  //   if (node.params.length) {
  //     // this.emitter.emitADDI(R.SP, R.SP, -node.params.length*WORD_SIZE, `make stack space for ${node.funDecl.id} ${-node.params.length*WORD_SIZE} arguments`);
  //     node.params.reverse().forEach((p, i) => {
  //       this.visitExpression(p);
  //       this.scopeStack.pushLocal(this.newLabel("param"), 4);
  //       this.pushStack(R.A0, `save function param ${i}:${node.funDecl.params[i].id} to stack`);
  //       // this.emitter.emitSW(R.A0, R.SP, i*WORD_SIZE, `save function param ${i}:${node.funDecl.params[i].id} to stack`);
  //     });
  //   }

  //   this.emitter.emitJAL(node.funDecl.id);
  // }
}

export const riscvCodeGenerator = new RiscvCodeGenerator();
