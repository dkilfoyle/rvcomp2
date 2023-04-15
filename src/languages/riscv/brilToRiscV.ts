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
  dataSection: GlobalVar[];
  currentFunction: IBrilFunction | undefined;
  registerAllocation: IRegisterAllocation;

  constructor() {
    this.emitter = new RiscvEmmiter();
    this.scopeStack = new LocalScopeStack();
    this.dataSection = [];
    this.currentFunction = undefined;
    this.registerAllocation = { graph: {}, coloring: {} };
    this.reset({ graph: {}, coloring: {} });
  }

  reset(registerAllocation: IRegisterAllocation) {
    this.emitter.reset();
    this.scopeStack.reset();
    this.labelCount = 0;
    this.dataSection = [];
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
    this.emitter.emitADDI(R.SP, R.SP, -4, "grow stack");
    this.emitter.emitSW(rs, R.SP, 0, comment);
  }

  popStack(rd: R, comment: string = `pop top of stack to X${rd}`) {
    this.emitter.emitLW(rd, R.SP, 0, comment);
    this.emitter.emitADDI(R.SP, R.SP, 4, "shrink stack");
  }

  getRegister(variableName: string) {
    if (_.isUndefined(this.registerAllocation.coloring)) {
      debugger;
      throw Error("Spilling not implemented yet");
    }
    if (!(this.currentFunction && this.currentFunction.name in this.registerAllocation.coloring)) {
      debugger;
      throw Error();
    }
    const reg = this.registerAllocation.coloring![this.currentFunction.name]![variableName];
    if (!(reg && reg in R)) {
      debugger;
      throw Error(`unable to get register for variable ${variableName}`);
    }
    return reg as R;
  }

  generate(bril: IBrilProgram, registerAllocation: IRegisterAllocation) {
    this.reset(registerAllocation);
    if (Object.keys(bril.functions).length == 0) {
      throw new Error("Empty bril");
    }
    const cfg = cfgBuilder.buildProgram(bril);

    this.emitter.startCode();
    this.emitter.emitGlobalLabel("main");

    Object.values(bril.functions).forEach((func) => this.generateFunction(func));

    this.emitter.startData();
    Array.from(bril.data).forEach(([symbolValue, symbolData]) => {
      throw Error("riscv data segment not implemneted yet");
      //this.emitter.emitGlobalVar(brilData..label, globalvar.type, globalvar.value);
    });

    return this.emitter.out;
  }

  generateFunction(func: IBrilFunction) {
    const asmFunctionStartLine = this.emitter.nextLine;

    // add a new scope for the function. SP starts at -WORD_SIZE to accomodate saved FP and RA
    const scope = this.scopeStack.enterFunction(func.name);
    if (!scope.context) throw Error();
    console.log(`Entering function ${func.name} scope: FP=${scope.context.FP}, initSP=${scope.context.SP}`);

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
    this.emitter.emitADDI(R.SP, R.SP, scope.context.SP, "Make space for start of AR");
    this.emitter.emitSW(R.FP, R.SP, 0, "Save caller's FP");
    this.emitter.emitSW(R.RA, R.SP, WORD_SIZE, "Save caller's RA");
    this.emitter.emitADDI(R.FP, R.SP, 2 * WORD_SIZE, "New FP is at old SP");

    const asmBodyStartLine = this.emitter.nextLine;
    this.emitter.emitComment(`${func.name} body`);

    this.generateInstructions(func.instrs, `${func.name} body`);

    const asmEpilogStartLine = this.emitter.nextLine;
    this.emitter.emitComment(`${func.name} epilogue`);
    if (func.name === "main") {
      this.emitter.emitLI(R.A0, 10, "Set A0 to 10 for exit ecall");
      this.emitter.emitECALL();
    } else {
      // Epilog
      this.emitter.emitLW(R.RA, R.FP, -1 * WORD_SIZE, "load saved RA");
      this.emitter.emitMV(R.T0, R.FP, "temp current FP (also = old SP)");
      this.emitter.emitLW(R.FP, R.FP, -2 * WORD_SIZE, "restore callers FP");
      this.emitter.emitMV(R.SP, R.T0, "restore caller's SP, deleting the callee AR");
      this.emitter.emitJR(R.RA, "jump back to caller (RA)");
    }
  }

  generateInstructions(instrs: IBrilInstructionOrLabel[], label: string) {
    instrs.forEach((instr) => {
      let ins;
      if ("label" in instr) {
        ins = instr as IBrilLabel;
        this.emitter.emitLocalLabel(ins.label);
      } else if ("op" in instr) {
        const insText = brilPrinter.formatInstruction(instr, 0, false);
        let binOpFn;
        switch (instr.op) {
          case "const":
            if (instr.type == "int") {
              ins = instr as IBrilConst;
              this.emitter.emitLI(this.getRegister(ins.dest), ins.value as number, insText);
            } else throw Error("unsupported const type");
            break;
          case "br":
            ins = instr as IBrilEffectOperation;
            if (!ins.args || !ins.labels) throw new Error("Branch instruction missing args - badly formed bril");
            this.emitter.emitBNEZ(this.getRegister(ins.args[0]), ins.labels[0], insText);
            if (ins.labels[1]) this.emitter.emitJ(ins.labels[1], insText);
            break;
          // integer binary numeric operations
          case "add":
          case "sub":
          case "mul":
          case "div":
          case "mod":
            ins = instr as IBrilValueOperation;
            if (!ins.args) throw new Error("Branch instruction missing args - badly formed bril");
            const rd = this.getRegister(ins.dest);
            const rs1 = this.getRegister(ins.args[0]);
            const rs2 = this.getRegister(ins.args[1]);
            switch (ins.op) {
              case "add":
                this.emitter.emitADD(rd, rs1, rs2, insText);
                break;
              case "sub":
                this.emitter.emitSUB(rd, rs1, rs2, insText);
                break;
              default:
                throw Error();
            }
            break;
          case "jmp":
            ins = instr as IBrilEffectOperation;
            if (!ins.labels) throw new Error("Branch instruction missing args - badly formed bril");
            this.emitter.emitJ(ins.labels[0], insText);
            break;
        }
      }
    });
  }

  // =================================================================================================================
  // top level AST nodes
  // =================================================================================================================

  visitRepl(node: AstRepl) {
    this.scopeStack.reset();

    // top level statements (AST wraps in main)
    const topLevelMain = node.functions[node.functions.length - 1];
    this.visitFunctionDeclaration(topLevelMain);

    // all the others
    node.functions.slice(0, node.functions.length - 1).forEach((funDecl) => this.visitFunctionDeclaration(funDecl));
  }

  visitFunctionDeclaration(node: AstFunctionDeclaration) {
    if (!node.body) {
      // TODO: extern function
      return;
    }

    const asmFunctionStartLine = this.emitter.nextLine;

    // add a new scope for the function. SP starts at -WORD_SIZE to accomodate saved FP and RA
    const scope = this.scopeStack.enterFunction(node.id);
    console.log(`Entering function ${node.id} scope: FP=${scope.context.FP}, initSP=${scope.context.SP}`);

    // add function parameters to function scope
    this.scopeStack.pushFunctionParams(node);

    this.emitter.emitLocalLabel(node.id);
    this.currentFunction = node;

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
    this.emitter.emitADDI(R.SP, R.SP, scope.context.SP, "Make space for start of AR");
    this.emitter.emitSW(R.FP, R.SP, 0, "Save caller's FP");
    this.emitter.emitSW(R.RA, R.SP, WORD_SIZE, "Save caller's RA");
    this.emitter.emitADDI(R.FP, R.SP, 2 * WORD_SIZE, "New FP is at old SP");

    const asmBodyStartLine = this.emitter.nextLine;
    this.emitter.emitComment(`${node.id} body`);
    this.visitBlock(node.body, `${node.id} body`, scope);

    const asmEpilogStartLine = this.emitter.nextLine;
    this.emitter.emitComment(`${node.id} epilogue`);
    if (node.id === "main") {
      this.emitter.emitLI(R.A0, 10, "Set A0 to 10 for exit ecall");
      this.emitter.emitECALL();
    } else {
      // Epilog
      this.emitter.emitLW(R.RA, R.FP, -1 * WORD_SIZE, "load saved RA");
      this.emitter.emitMV(R.T0, R.FP, "temp current FP (also = old SP)");
      this.emitter.emitLW(R.FP, R.FP, -2 * WORD_SIZE, "restore callers FP");
      this.emitter.emitMV(R.SP, R.T0, "restore caller's SP, deleting the callee AR");
      this.emitter.emitJR(R.RA, "jump back to caller (RA)");
    }

    this.rangeMap.push(
      ...[
        {
          // prolog
          left: {
            startLine: node.pos.startLine,
            endLine: node.body.pos.startLine - 1,
            col: "red",
          },
          right: { startLine: asmFunctionStartLine, endLine: asmBodyStartLine - 1, col: "red" },
          name: `${node.id}_prolog`,
        },
        {
          // body
          left: {
            startLine: node.body.pos.startLine,
            endLine: node.body.pos.endLine,
            col: "red",
          },
          right: {
            startLine: asmBodyStartLine,
            endLine: asmEpilogStartLine - 1,
            col: "red",
          },
          name: `${node.id}_body`,
        },
        {
          //epilog
          left: { startLine: node.body.pos.endLine + 1, endLine: node.pos.endLine, col: "green" },
          right: {
            startLine: asmEpilogStartLine,
            endLine: this.emitter.nextLine - 1,
            col: "green",
          },
          name: `${node.id}_epilog`,
        },
        {
          //full function
          left: { startLine: node.pos.startLine, endLine: node.pos.endLine, col: "#d4fafa" },
          right: {
            startLine: asmFunctionStartLine,
            endLine: this.emitter.nextLine - 1,
            col: "#d4fafa",
          },
          name: `${node.id}_func`,
        },
      ]
    );
  }

  // =================================================================================================================
  // statement nodes
  // =================================================================================================================

  visitStatement(node: AstStatement) {
    if (node instanceof AstFunctionCall) this.visitFunctionCall(node);
    else if (node instanceof AstBlock) this.visitBlock(node);
    else if (node instanceof AstAssignment) this.visitAssignment(node);
    else if (node instanceof AstVariableDeclaration) this.visitVariableDeclaration(node);
    else if (node instanceof AstArrayDeclaration) this.visitArrayDeclaration(node);
    else if (node instanceof AstReturn) this.visitReturn(node);
    // else if (node instanceof AstPrintf)
    //   return this.visitPrintf(node);
    else if (node instanceof AstIf) this.visitIf(node);
    else if (node instanceof AstWhile) this.visitWhile(node);
    else throw new Error();
  }

  visitFunctionCall(node: AstFunctionCall) {
    if (node.funDecl.id === "print_int") {
      const startLine = this.emitter.nextLine;
      this.visitExpression(node.params[0]);
      this.emitter.emitMV(R.A1, R.A0, "Move A0 to A1 to be argument for print_int ecall");
      this.emitter.emitLI(R.A0, 1, "print_int ecall");
      this.emitter.emitECALL();
      this.rangeMap.push({
        left: { ...node.pos, col: "red" },
        right: { startLine, endLine: this.emitter.nextLine - 1, col: "blue" },
      });
      return;
    }

    if (node.funDecl.id === "print_string") {
      this.visitExpression(node.params[0]);
      this.emitter.emitMV(R.A1, R.A0, "Move A0 to A1 to be argument for print_string ecall");
      this.emitter.emitLI(R.A0, 4, "print_string ecall");
      this.emitter.emitECALL();
      return;
    }

    this.emitter.emitComment(`call ${node.toCode()}`);

    //  AR Start:   Caller's FP   } Set by caller
    //              A3            } "
    //              A2            } "
    //    FP -->    A1            } "
    //              RA            ] Set by callee (RA is not set until after JAL)
    //    SP -->    Caller FP     ] "

    // Function argument[n] can be retrieved from (4*(n+1))(FP)
    // eg LW a0, 4(FP) => a0 = arg[0]

    // push params onto AR in reverse order
    if (node.params.length) {
      // this.emitter.emitADDI(R.SP, R.SP, -node.params.length*WORD_SIZE, `make stack space for ${node.funDecl.id} ${-node.params.length*WORD_SIZE} arguments`);
      node.params.reverse().forEach((p, i) => {
        this.visitExpression(p);
        this.scopeStack.pushLocal(this.newLabel("param"), 4);
        this.pushStack(R.A0, `save function param ${i}:${node.funDecl.params[i].id} to stack`);
        // this.emitter.emitSW(R.A0, R.SP, i*WORD_SIZE, `save function param ${i}:${node.funDecl.params[i].id} to stack`);
      });
    }

    this.emitter.emitJAL(node.funDecl.id);
  }

  visitReturn(node: AstReturn) {
    this.visitExpression(node.returnExpression);
  }

  visitBlock(node: AstBlock, label: string = "", functionScope?: Scope<LocalVariable, LocalScope>) {
    const scope = functionScope || this.scopeStack.enterBlock(label);
    const startSP = scope.context.SP;

    // preprocess all block level local variable declarations to build scope
    for (let statement of node.body) {
      if (statement instanceof AstVariableDeclaration) {
        this.scopeStack.pushLocal(statement.id, statement.type.sizeInBytes);
      }
      if (statement instanceof AstArrayDeclaration) {
        this.scopeStack.pushLocal(statement.id, statement.type.sizeInBytes);
      }
    }

    // grow the stack to make space for the locals
    if (scope.context.SP < 0) {
      this.emitter.emitADDI(
        R.SP,
        R.SP,
        scope.context.SP - startSP,
        `reserve stack space for ${Object.keys(scope.entries).length} locals ${Object.keys(scope.entries)}`
      );
    } else this.emitter.emitComment("no locals to reserve stack for");

    for (let statement of node.body) {
      this.visitStatement(statement);
    }

    if (scope.context.SP < 0)
      this.emitter.emitADDI(
        R.SP,
        R.FP,
        this.scopeStack.top().context.FP,
        `pop all ${label} locals off stack by setting SP to FP (SP at block start)`
      );
    else this.emitter.emitComment("no locals to pop off stack");

    this.scopeStack.disposeScope();
  }

  visitVariableDeclaration(node: AstVariableDeclaration) {
    // get offset from scope
    const offset = this.scopeStack.getLocalVarOffset(node.id);
    console.log(offset, this.scopeStack);

    if (node.initialExpression) {
      this.visitExpression(node.initialExpression);
      this.emitter.emitSW(R.A0, R.FP, offset.fpoffset, `push local var ${node.id} to stack and init value`);
    } else this.emitter.emitSW(R.ZERO, R.FP, offset.fpoffset, `push local var ${node.id} to stack and init to 0`);
  }

  buildArrayAt(expressions: AstExpression[], fpoffset: number, id = "") {
    expressions.forEach((e, i) => {
      this.visitExpression(e);
      this.emitter.emitSW(R.A0, R.FP, fpoffset + i * 4, `init array var ${id} item ${i}`);
    });
  }

  visitArrayDeclaration(node: AstArrayDeclaration) {
    // get offset from scope
    const offset = this.scopeStack.getLocalVarOffset(node.id);

    const startLine = this.emitter.nextLine;

    if (node.initialExpression) {
      this.buildArrayAt(node.initialExpression.expressions, offset.fpoffset, node.id);
    } else this.emitter.emitSW(R.ZERO, R.FP, offset.fpoffset, `push local var ${node.id} to stack and init to 0`);

    this.rangeMap.push({
      left: { ...node.pos, col: "red" },
      right: { startLine, endLine: this.emitter.nextLine - 1, col: "blue" },
    });
  }

  visitAssignment(node: AstAssignment) {
    // check type compatibility
    if (node.lhsVariable.returnType.toString() !== node.rhsExpression.returnType.toString())
      this.errors.push(
        new CompilerError(node.pos, `Assignment type mismatch: ${node.lhsVariable.returnType} != ${node.rhsExpression.returnType}`)
      );

    // if (node.lhsVariable.returnType.toString() === "int[]") {
    //   this.errors.push(new CompilerError(node.pos, "array assignment not implemented yet"));
    //   return;
    // }

    const startLine = this.emitter.nextLine;

    debugger;

    if (node.lhsVariable.returnType.isArray()) {
      debugger;
      // todo;
      // x = [1,2,3]
      // Should ? make temp array and then copy over
      // or copy each array item over - prob this one
      // or listExpr should be generated on heap returning address?
    }

    // store rhs in A0
    this.visitExpression(node.rhsExpression);

    const lhsID = node.lhsVariable.declaration.id;
    if (node.lhsVariable.indexExpressions?.length) {
      // lhs is of form x[y]
      this.emitter.emitMV(R.T1, R.A0, "save assignment rhs in T1");

      // calculate array item address in A0
      this.calcArrayOffset(lhsID, node.lhsVariable.indexExpressions);

      this.emitter.emitSW(R.T1, R.A0, 0, "save RHS(T1) to array item at offset A0");
    } else {
      // calculate offset
      let offset = this.scopeStack.getLocalVarOffset(lhsID).fpoffset;
      this.emitter.emitSW(R.A0, R.FP, offset, "save RHS to variable on stack");
    }

    this.rangeMap.push({
      left: { ...node.pos, col: "red" },
      right: { startLine, endLine: this.emitter.nextLine - 1, col: "blue" },
    });
  }

  // visitPrintf(node: AstPrintf) {
  //   const vargs = node.args.map(arg => this.visitExpression(arg));
  //   this.builder.CreateCall(this.module.getFunction("printf"), [this.builder.CreateGlobalStringPtr(node.format.replace("\\n", "\x0a")), ...vargs], "printfcall")
  // }

  visitIf(node: AstIf) {
    const start = this.emitter.nextLine;
    const thenLabel = this.newLabel("then");
    const exitLabel = this.newLabel("exitIf");

    this.visitExpression(node.ifExpression);
    this.emitter.emitBNEZ(R.A0, thenLabel, "if true jump to then");

    if (node.elseBlock) {
      this.emitter.emitLocalLabel(this.newLabel("else"), "else label");
      if (node.elseBlock instanceof AstBlock) this.visitBlock(node.elseBlock, "if else");
      else this.visitStatement(node.elseBlock);
    }
    this.emitter.emitJ(exitLabel, "jump to exit if");

    this.emitter.emitLocalLabel(thenLabel);
    if (node.thenBlock instanceof AstBlock) this.visitBlock(node.thenBlock, "if then");
    else this.visitStatement(node.thenBlock);

    this.emitter.emitLocalLabel(exitLabel);

    this.rangeMap.push({
      left: {
        startLine: node.pos.startLine,
        endLine: node.pos.endLine,
        col: "red",
      },
      right: {
        startLine: start,
        endLine: this.emitter.nextLine - 1,
        col: "blue",
      },
      name: "while",
    });
  }

  visitWhile(node: AstWhile) {
    const start = this.emitter.nextLine;
    const testLabel = this.newLabel("whiletest");
    const exitLabel = this.newLabel("exitwhile");

    this.emitter.emitLocalLabel(testLabel);
    this.visitExpression(node.testExpression);
    this.emitter.emitBEQZ(R.A0, exitLabel, "if not true exit loop");

    if (node.block instanceof AstBlock) this.visitBlock(node.block, "while block");
    else this.visitStatement(node.block);

    this.emitter.emitJ(testLabel, "loop back to test");

    this.emitter.emitLocalLabel(exitLabel);
    this.rangeMap.push({
      left: {
        startLine: node.pos.startLine,
        endLine: node.pos.endLine,
        col: "red",
      },
      right: {
        startLine: start,
        endLine: this.emitter.nextLine - 1,
        col: "blue",
      },
      name: "while",
    });
  }

  // =================================================================================================================
  // EXPRESSION nodes
  // =================================================================================================================

  visitExpression(node: AstExpression) {
    if (node instanceof AstConstExpression) return this.visitConstExpression(node);
    else if (node instanceof AstBinaryExpression) return this.visitBinaryExpression(node);
    else if (node instanceof AstUnaryExpression) return this.visitUnaryExpression(node);
    else if (node instanceof AstVariableExpression) return this.visitVariableExpression(node);
    else if (node instanceof AstFunctionCall) return this.visitFunctionCall(node);
    else if (node instanceof AstListExpression) return this.visitListExpression(node);
    else throw new Error();
  }

  visitConstExpression(node: AstConstExpression) {
    // return llvm.ConstantInt.get(this.context, node.value);
    if (node.returnType.baseType === "int") this.emitter.emitLI(R.A0, node.value as number, `Load constant ${node.value} to a0`);
    else if (node.returnType.baseType === "string") {
      const label = this.newLabel("stringconst");
      let value = node.value as string;
      this.dataSection.push({ label, type: "asciiz", value: value });
      this.emitter.emitLA(R.A0, label, "Load address of string const in data section");
    }
  }

  visitListExpression(node: AstListExpression) {
    // expr in form [e,e,e,...]

    // create a new local variable on stack to hold the array
    const anonListID = this.newLabel("anonList");
    const anonListVar = this.scopeStack.pushLocal(anonListID, node.expressions.length * 4);

    this.emitter.emitADDI(R.SP, R.SP, -anonListVar.size, `reserve stack for anon[${node.expressions.length}]`);

    this.buildArrayAt(node.expressions, anonListVar.fpoffset, anonListID);

    console.log(
      "visitListExpression",
      this.scopeStack.getCurrentContext().FP,
      this.scopeStack.getLocalVarOffset(anonListID).fpoffset,
      4096 + this.scopeStack.getCurrentContext().FP + this.scopeStack.getLocalVarOffset(anonListID).fpoffset
    );

    // set A0 to array address
    this.emitter.emitLI(
      R.A0,
      4096 + this.scopeStack.getCurrentContext().FP + 8 + this.scopeStack.getLocalVarOffset(anonListID).fpoffset,
      "A0 = list[0] address"
    );
  }

  calcArrayOffset(id: string, indexExpressions: AstExpression[]) {
    const offset = this.scopeStack.getLocalVarOffset(id).fpoffset;
    this.emitter.emitADDI(R.A0, R.FP, offset, `get pointer to start of array ${id}`);
    this.pushStack(R.A0, "push array pointer to stack");

    // calculate e of x[e], result in A0
    this.visitExpression(indexExpressions[0]);

    this.popStack(R.A1, "pop array pointer off stack");
    this.emitter.emitSLLI(R.A0, R.A0, 2, "Index in bytes");
    this.emitter.emitADD(R.A0, R.A1, R.A0, "array pointer + index in bytes");
  }

  visitVariableExpression(node: AstVariableExpression) {
    const id = node.declaration.id;
    const offset = this.scopeStack.getLocalVarOffset(id).fpoffset;

    // expression is of form x[e] where e is an expression
    if (node.indexExpressions) {
      // todo: implement multidimensional referencing ie x[e0][e1]...
      this.calcArrayOffset(id, node.indexExpressions);

      this.emitter.emitLW(R.A0, R.A0, 0, `retrieve ${id}[A0]`);
    } else {
      this.emitter.emitLW(R.A0, R.FP, offset, `retrieve ${offset >= 0 ? "func param" : "local variable"} ${node.declaration.id}`);
    }
  }

  visitUnaryExpression(node: AstUnaryExpression) {
    this.visitExpression(node.rhs); // accummualtor will be saved to a0 = result of RHS
    switch (node.op) {
      case "-":
        this.emitter.emitSUB(R.A0, R.ZERO, R.A0, "Unary negation");
        break;
      default:
        throw new Error();
    }
  }

  visitBinaryExpression(node: AstBinaryExpression) {
    // compute LHS, save result to stack
    this.visitExpression(node.lhs); // accumulator will be saved to a0 = result of LHS
    const lhsTempLabel = this.newLabel("LHSTemp");
    const offset = this.scopeStack.pushLocal(lhsTempLabel, 4);
    this.pushStack(R.A0, `push a0 (LHS result of ${node.lhs.toCode()}) onto stack as ${lhsTempLabel} ${offset.fpoffset}`);

    // compute RHS, result in A0
    this.visitExpression(node.rhs); // accumulator will be saved to a0 = result of RHS

    // retrieve LHS in T1
    this.emitter.emitLW(R.T1, R.FP, this.scopeStack.getLocalVarOffset(lhsTempLabel).fpoffset, `t1 = saved LHS (${lhsTempLabel})`);

    switch (node.op) {
      case "+":
        this.emitter.emitADD(R.A0, R.T1, R.A0, `a0 = t1 + a0 (${node.lhs.toCode()}) + ${node.rhs.toCode()})`);
        break;
      case "*":
        library.mul.include = true;
        this.pushStack(R.A1, "save copy of A1 to stack");
        this.emitter.emitMV(R.A1, R.T1, "Move T1 to A1");
        this.emitter.emitJAL("__mulsi3", "a0 = a0 * a1");
        this.popStack(R.A1, "restore A1 from stack");
        break;
      case "/":
        library.div.include = true;
        this.pushStack(R.A1, "save copy of A1 to stack");
        this.pushStack(R.A2, "save copy of A2 to stack");
        this.pushStack(R.A3, "save copy of A3 to stack");
        this.emitter.emitMV(R.A1, R.T1, "Move T1 to A1");
        this.emitter.emitJAL("__divsi3", "a0 = a0 / a1");
        this.popStack(R.A3, "restore A3 from stack");
        this.popStack(R.A2, "restore A2 from stack");
        this.popStack(R.A1, "restore A1 from stack");
        break;
      case "%":
        library.div.include = true;
        this.pushStack(R.A1, "save copy of A1 to stack");
        this.pushStack(R.A2, "save copy of A2 to stack");
        this.pushStack(R.A3, "save copy of A3 to stack");
        this.emitter.emitMV(R.A1, R.T1, "Move T1 to A1");
        this.emitter.emitJAL("__modsi3", "a0 = a0 % a1");
        // this.popStack(R.A3, "restore A3 from stack");
        // this.popStack(R.A2, "restore A2 from stack");
        // this.popStack(R.A1, "restore A1 from stack");
        break;
      case "-":
        this.emitter.emitSUB(R.A0, R.T1, R.A0, `a0 = t1 - a0 (${node.lhs.toCode()}) - ${node.rhs.toCode()})`);
        break;
      case "==":
        this.emitter.emitSUB(R.A0, R.T1, R.A0, `a0 = t1 - a0 (${node.lhs.toCode()}) - ${node.rhs.toCode()})`);
        this.emitter.emitSEQZ(R.A0, R.A0, "a0 = a0 (lhs-rhs) == 0");
        break;
      case "<":
        this.emitter.emitSLT(R.A0, R.T1, R.A0, `a0 = t1 < a0 (${node.lhs.toCode()} < ${node.rhs.toCode()})`);
        break;
      case ">=":
        this.emitter.emitSLT(R.A0, R.T1, R.A0, `a0 = t1 < a0 (${node.lhs.toCode()} < ${node.rhs.toCode()})`);
        this.emitter.emitNOT(R.A0, R.A0, "A0 = !A0 because >= is !<");
        break;
      case ">":
        this.emitter.emitSLT(R.A0, R.A0, R.T1, `a0 = a0 < t1 (equiv a0 > t1) (${node.lhs.toCode()} > ${node.rhs.toCode()})`);
        break;
      case "<=":
        this.emitter.emitSLT(R.A0, R.A0, R.T1, `a0 = a0 (rhs: ${node.rhs.toCode()}) < t1 (lhs: ${node.lhs.toCode()})`);
        this.emitter.emitNOT(R.A0, R.A0, "A0 = !A0 because <= is !>");
        break;
      default:
        throw new Error();
    }
    this.emitter.emitADDI(R.SP, R.SP, 4, `pop lhs temporary ${lhsTempLabel} off stack`);
    this.scopeStack.popLocal();
  }
}

export const riscvCodeGenerator = new RiscvCodeGenerator();
