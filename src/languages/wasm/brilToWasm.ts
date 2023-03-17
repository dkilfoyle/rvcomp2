// adapted from https://github.com/ColinEberhardt/chasm
// information on sections https://coinexsmartchain.medium.com/wasm-introduction-part-1-binary-format-57895d851580

import _ from "lodash";
import {
  IBrilArgument,
  IBrilConst,
  IBrilEffectOperation,
  IBrilFunction,
  IBrilInstruction,
  IBrilInstructionOrLabel,
  IBrilLabel,
  IBrilParamType,
  IBrilProgram,
  IBrilType,
  IBrilValueInstruction,
} from "../bril/BrilInterface";
import { cfgBuilder, getCfgBlockMap, getCfgEdges, ICFG, ICFGBlock } from "../bril/cfg";
import { findCommonDescendent, findCommonSuccessor, getDominatorMap } from "../bril/dom";
import { getBackEdges, getNaturalLoops } from "../bril/loops";
import { unsignedLEB128, signedLEB128, encodeString, ieee754 } from "./encoding";
import {
  Opcodes,
  functionType,
  encodeVector,
  Valtype,
  emptyArray,
  Blocktype,
  IWasmOpCode,
  encodeLocal,
  createSection,
  Section,
  Mutable,
  ExportType,
  magicModuleHeader,
  moduleVersion,
} from "./wasm";
import { libraryFunctions } from "./wasmLib";

export let allSymbols: Record<string, string[]> = {};

export const convertBrilToWasmType = (type: IBrilType) => {
  if (typeof type == "object" && "ptr" in type) return "i32";
  switch (type) {
    case "int":
    case "char":
      return "i32"; // chars are read into a i32
    case "float":
      return "f32";
    case "bool":
      return "i32";
    case "void":
      return "void";
    default:
      debugger;
      throw new Error(`Unsupported variable type ${type}`);
  }
};

export const flatten = (arr: any[]) => [].concat.apply([], arr);

enum Offsets {
  screen = 0,
  data = 40960,
}

const encodeConstI32_Signed = (i32: number) => {
  return [Opcodes.i32_const, ...signedLEB128(i32), Opcodes.end];
};
const encodeConstI32_UnSigned = (i32: number) => {
  return [Opcodes.i32_const, ...unsignedLEB128(i32), Opcodes.end];
};

const importedFunctions = [
  { name: "print_int", argTypes: [Valtype.i32], retType: Valtype.void },
  { name: "print_bool", argTypes: [Valtype.i32], retType: Valtype.void },
  { name: "print_float", argTypes: [Valtype.f32], retType: Valtype.void },
  { name: "print_string", argTypes: [Valtype.i32], retType: Valtype.void },
  { name: "print_char", argTypes: [Valtype.i32], retType: Valtype.void },
  { name: "render", argTypes: [], retType: Valtype.void },
  { name: "random", argTypes: [], retType: Valtype.f32 },
];

const emitWasmFunction = (
  func: IBrilFunction,
  program: IBrilProgram,
  cfg: ICFG,
  globals: Record<string, { index: number; bytes: number[] }>
) => {
  const code: number[] = [];

  const blockArray = cfg[func.name];

  if (!blockArray) throw new Error(`cfg does not contain function ${func.name}`);

  let blockMap = getCfgBlockMap(blockArray);
  // optimised bril already has entry and terminators
  // blockMap = addCfgEntry(blockMap);
  // addCfgTerminators(blockMap);
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
  const dom = getDominatorMap(successorsMap, blockArray[0].name);
  const backEdges = getBackEdges(blockArray, dom, successorsMap);
  const loops = getNaturalLoops(backEdges, predecessorsMap);

  const localsymbols = new Map<string, { index: number; type: Valtype }>(
    func.args.map((arg, index) => [arg.name, { index, type: Valtype[convertBrilToWasmType(arg.type)] }])
  );

  const localIndexForSymbol = (name: string, type?: IBrilType) => {
    if (!localsymbols.has(name)) {
      if (!type) {
        debugger;
        throw new Error("Need type for local symbol initiation");
      }
      localsymbols.set(name, { index: localsymbols.size, type: Valtype[convertBrilToWasmType(type)] });
    }
    return localsymbols.get(name)!;
  };

  const emitBlock = (block: ICFGBlock, stopBlock?: string) => {
    // check if this block is the start of a natural loop
    const loop = loops.find((loop) => loop[0] == block.name);
    const backedge = backEdges.find(([tail, head]) => head == block.name);
    const ifBlock = block.out.length == 2 && !loop;
    if (loop) {
      if (!backedge) throw new Error("Loop must have backedge");
      // start while loop
      code.push(Opcodes.block, Blocktype.void); // outer block
      code.push(Opcodes.loop, Blocktype.void); // inner loop

      // emit the instructions for the curren block
      emitInstructions(block.instructions, true);

      // one of the two child blocks will be the start of the loop
      const loopBodyChild = block.out.findIndex((childBlockName) => loop.includes(childBlockName));
      if (loopBodyChild == -1) throw new Error(`${block.name} block is the start of a loop, one of the out edges must be in a loop`);
      emitBlock(blockMap[block.out[loopBodyChild]], backedge[1]);

      // close the while loop
      code.push(Opcodes.br, ...signedLEB128(0)); // (br $L1)
      code.push(Opcodes.end); // end loop
      code.push(Opcodes.end); // end block

      // visit the loop exit block
      const loopExitChild = loopBodyChild == 0 ? 1 : 0;
      emitBlock(blockMap[block.out[loopExitChild]], stopBlock);
    } else if (ifBlock) {
      // console.log("Emitting ifblock", block.name);
      emitInstructions(block.instructions, false);

      // end if block will be where the if and else paths converge
      const endIfBlock = findCommonSuccessor(successorsMap, backEdges, block.out[0], block.out[1]);
      if (endIfBlock == "") throw new Error(`findCommonSuccessor found no result for ${block.out[0]}, ${block.out[1]}`);
      // console.log("  endif block = ", endIfBlock);

      // traverse then blocks until reach endif
      // console.log("  traversing then for ", block.name);
      emitBlock(blockMap[block.out[0]], endIfBlock);

      // traverse else blocks (if present) until reach endif
      if (block.out[1] !== endIfBlock) {
        // console.log("  traversing else for ", block.name);
        code.push(Opcodes.else);
        emitBlock(blockMap[block.out[1]], endIfBlock);
      }

      // traverse the endIfBlock
      code.push(Opcodes.end);
      // console.log(`  traversing endifblock for ${block.name} = ${endIfBlock}`);
      emitBlock(blockMap[endIfBlock], stopBlock);
    } else {
      emitInstructions(block.instructions, false);
      block.out.forEach((childBlock) => {
        if (childBlock !== stopBlock) emitBlock(blockMap[childBlock], stopBlock);
      });
    }
  };

  const emitInstructions = (instructions: IBrilInstructionOrLabel[], isLoopHeader: boolean) => {
    const blockStatus: string[] = ["root"];
    instructions.forEach((instr) => {
      if ("op" in instr)
        switch (instr.op) {
          case "const":
            const constInstr = instr as IBrilConst;
            if (typeof constInstr.type == "object" && "ptr" in constInstr.type && (instr.type as IBrilParamType).ptr == "char") {
              if (typeof constInstr.value != "number") throw new Error("ptr<char> should be number");
              const constdest = localIndexForSymbol(instr.dest, instr.type).index;
              code.push(Opcodes.i32_const);
              code.push(...signedLEB128(constInstr.value));
              code.push(Opcodes.set_local);
              code.push(...unsignedLEB128(constdest));
            } else {
              const consttype = convertBrilToWasmType(instr.type);
              const constopcode = `${consttype}_const` as IWasmOpCode;
              const constdest = localIndexForSymbol(instr.dest, instr.type).index;
              code.push(Opcodes[constopcode]);
              code.push(...(consttype == "f32" ? ieee754(Number(instr.value)) : signedLEB128(Number(instr.value))));
              code.push(Opcodes.set_local);
              code.push(...unsignedLEB128(constdest));
              // console.log(`(set_local ${constdest} (${constopcode} ${instr.value}))`);
            }
            break;
          // integer binary numeric operations
          case "add":
          case "sub":
          case "mul":
          case "div":
          case "mod":
          // binary comparison operations
          case "lt":
          case "le":
          case "gt":
          case "ge":
          case "eq":
          case "and":
          case "or":
          // float binary numeric operations
          case "fadd":
          case "fsub":
          case "fmul":
          case "fdiv":
          case "fmod":
          // float comparison operations
          case "flt":
          case "fle":
          case "fgt":
          case "fge":
          case "feq":
          // ptr numeric
          case "ptradd":
            const binInstrType = instr.type;
            const binarg0 = localIndexForSymbol(instr.args[0], binInstrType);
            code.push(Opcodes.get_local, ...unsignedLEB128(binarg0.index));

            const binarg1 = localIndexForSymbol(instr.args[1], binInstrType);
            code.push(Opcodes.get_local, ...unsignedLEB128(binarg1.index));

            if (instr.op == "ptradd") {
              if (!(typeof binInstrType == "object" && "ptr" in binInstrType)) throw new Error("ptradd type must be ptr");
              const ptrVarSize = binInstrType.ptr == "char" ? 1 : 4;
              code.push(Opcodes.i32_const, ...signedLEB128(ptrVarSize));
              code.push(Opcodes.i32_mul);
            }
            if (binarg0.type != binarg1.type) throw new Error(`Binary operands must be of same type: ${binarg0.type} != ${binarg1.type}`);
            if (instr.op.startsWith("f") && binarg0.type !== Valtype.f32)
              throw new Error(`Binary float operation ${instr.op} expects float operands, got ${binarg0.type}`);

            const instrop = instr.op == "ptradd" ? "add" : instr.op;
            const binopcode = binarg0.type == Valtype.i32 ? (`i32_${instrop}` as IWasmOpCode) : (`f32_${instrop.slice(1)}` as IWasmOpCode);
            code.push(Opcodes[binopcode]);
            // console.log(`(${binopcode} (get_local ${binarg0}) (get_local ${binarg1}))`);

            const bindest = localIndexForSymbol(instr.dest, binInstrType).index;
            code.push(Opcodes.set_local);
            code.push(...unsignedLEB128(bindest));
            // console.log(`(set_local ${bindest})`);
            break;
          case "id":
            const idinstrtype = instr.type;
            const idrhsIndex = localIndexForSymbol(instr.args[0], idinstrtype).index;
            const idlhsIndex = localIndexForSymbol(instr.dest, idinstrtype).index;

            code.push(Opcodes.get_local);
            code.push(...unsignedLEB128(idrhsIndex));

            code.push(Opcodes.set_local);
            code.push(...unsignedLEB128(idlhsIndex));
            // console.log(`(set_local ${idlhsIndex} (get_local ${idrhsIndex}))`);
            break;
          case "br":
            if (!instr.labels) throw new Error("Instr missing labels - badly formed bril");
            const brInstr = instr as IBrilEffectOperation;
            if (!brInstr.args) throw new Error("Branch instruction missing args - badly formed bril");
            if (isLoopHeader) {
              // block is a natural looper header
              // br will be of form: br cond whileBody whileEnd
              code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol(brInstr.args[0]).index)); // load the cond local variable
              // exit loop if !true
              code.push(Opcodes.i32_eqz);
              code.push(Opcodes.br_if);
              code.push(...signedLEB128(1));
            } else {
              // if not a loop header then must be a if header
              // load test bool var onto top of stack
              code.push(Opcodes.get_local);
              code.push(...unsignedLEB128(localIndexForSymbol(brInstr.args[0], "int").index));

              // start the if block
              code.push(Opcodes.if);
              code.push(Blocktype.void);
            }
            break;
          case "call":
            if (!instr.funcs) throw new Error(`Instr.funcs missing, badly formed bril`);
            const funcName = instr.funcs[0];
            let callFuncIndex: number;
            let calleeSignature: number[];
            let calleeReturnType: number;

            const importedFuncIndex = importedFunctions.findIndex((importfunc) => importfunc.name == funcName);
            if (importedFuncIndex !== -1) {
              callFuncIndex = importedFuncIndex;
              calleeSignature = importedFunctions[importedFuncIndex].argTypes;
              calleeReturnType = importedFunctions[importedFuncIndex].retType;
            } else {
              const programFuncIndex = Object.keys(program.functions).findIndex((f) => f === funcName);
              if (programFuncIndex !== -1) {
                callFuncIndex = importedFunctions.length + programFuncIndex;
                calleeSignature = program.functions[funcName].args.map((arg) => Valtype[convertBrilToWasmType(arg.type)]);
                calleeReturnType = Valtype[convertBrilToWasmType(program.functions[funcName].type!)];
              } else {
                const libraryFuncIndex = Object.keys(libraryFunctions).findIndex((f) => f === funcName);
                if (libraryFuncIndex !== -1) {
                  callFuncIndex = Object.keys(program.functions).length + importedFunctions.length + libraryFuncIndex;
                  calleeSignature = Object.values(libraryFunctions)[libraryFuncIndex].argTypes;
                  calleeReturnType = Object.values(libraryFunctions)[libraryFuncIndex].retType;
                } else throw new Error(`calling unknown function ${funcName}`);
              }
            }

            // push each argument onto the stack before emiting call opcode
            // cast floats to ints if needed
            instr.args?.forEach((argName, argIndex) => {
              const argSymbol = localsymbols.get(argName);
              if (!argSymbol) throw new Error(`Emit call: argument[${argName}] undefined`);
              code.push(Opcodes.get_local);
              code.push(...unsignedLEB128(argSymbol.index));
              if (argSymbol.type == Valtype.f32 && calleeSignature[argIndex] == Valtype.i32) {
                // cast f32 argument to i32 parameter
                code.push(Opcodes.i32_trunc_f32_s);
              }
            });
            // const argIndexes = instr.args?.map((arg) => localsymbols.get(arg)!.index);
            // argIndexes?.forEach((argIndex, i) => {
            //   if (_.isUndefined(argIndex)) {
            //     throw new Error(`Emit call: argument[${i}] undefined`);
            //   }
            //   code.push(Opcodes.get_local);
            //   code.push(...unsignedLEB128(argIndex));
            // });

            // emit call
            code.push(Opcodes.call);
            code.push(...unsignedLEB128(callFuncIndex));

            if ("dest" in instr) {
              // dest = pop return value off stack
              code.push(Opcodes.set_local, ...unsignedLEB128(localIndexForSymbol(instr.dest, instr.type).index));
            } else if (calleeReturnType != Valtype.void) {
              // throw away dest
              code.push(Opcodes.drop);
            }

            //const argIndexesString = argIndexes?.map((i) => `(get_local ${i})`);
            // console.log(`(call ${callFuncIndex} ${argIndexesString})`);
            break;
          case "jmp":
            // console.log("ignoring jmp", instr.labels);
            // do nothing as block movement is via blockStack
            break;
          case "store":
            const storeinstr = instr as IBrilEffectOperation;
            if (!instr.args) throw new Error("Store instruction has no args");
            const offsetVarIndex = localIndexForSymbol(instr.args[0]).index;
            const valueVar = localIndexForSymbol(instr.args[1]);
            code.push(Opcodes.get_local, ...unsignedLEB128(offsetVarIndex));
            code.push(Opcodes.get_local, ...unsignedLEB128(valueVar.index));
            if (valueVar.type == Valtype.i32) {
              code.push(Opcodes.i32_store, 2, 0);
            } else {
              code.push(Opcodes.f32_store, 2, 0);
            }
            break;
          case "load":
            const loadinstr = instr as IBrilValueInstruction;
            const addressVar = localIndexForSymbol(instr.args[0]);

            // push the address in args[0] to stack
            code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol(instr.args[0]).index));

            // emit the appropriate load instruction
            switch (instr.type) {
              case "int":
                code.push(Opcodes.i32_load, 2, 0);
                break;
              case "char":
                code.push(Opcodes.i32_load8_u, 0, 0);
                break;
              default:
                debugger;
                throw new Error("Unsupported load ptr type");
            }
            // pop the stack to local dest
            code.push(Opcodes.set_local, ...unsignedLEB128(localIndexForSymbol(instr.dest, instr.type).index));
            break;
          case "ret":
            if (instr.args?.length) {
              // push return value onto stack
              code.push(Opcodes.get_local);
              // args[0] should already exist so type doesnt matter
              code.push(...unsignedLEB128(localIndexForSymbol(instr.args[0], "int").index));
            } else {
              // return 0 by default
              //code.push(...unsignedLEB128(0));
            }
            code.push(Opcodes.return);
            break;
          case "alloc":
            // set dest to current heap_pointer
            code.push(Opcodes.get_global, ...unsignedLEB128(globals.heap_pointer.index));
            code.push(Opcodes.set_local, ...unsignedLEB128(localIndexForSymbol(instr.dest, instr.type).index));

            // array length is already stored in local instr.args[0]
            const allocLengthVar = localIndexForSymbol(instr.args[0], "int").index;

            // store the array length at heap_pointer + 0
            // code.push(Opcodes.get_global, ...unsignedLEB128(globals.heap_pointer.index)); // (get_global $heap_pointer)
            // code.push(Opcodes.get_local, ...unsignedLEB128(allocLengthVar));
            // code.push(Opcodes.i32_store, 2, 0); // (i32.store (get_global $heap_pointer) (get_local $lengthconst))

            // // calculate new heap_pointer = heap_pointer + arraylength*4 + 4
            // // (4 bytes per i32)

            // // arraylength * 4
            code.push(Opcodes.get_local, ...unsignedLEB128(allocLengthVar));
            code.push(Opcodes.i32_const, ...signedLEB128(4));
            code.push(Opcodes.i32_mul);

            // // + heap_pointer
            code.push(Opcodes.get_global, ...unsignedLEB128(globals.heap_pointer.index)); // (get_global $heap_pointer)
            code.push(Opcodes.i32_add);

            // // + 4 for length of array
            // code.push(Opcodes.i32_const, ...signedLEB128(4));
            // code.push(Opcodes.i32_add);

            code.push(Opcodes.set_global, ...unsignedLEB128(globals.heap_pointer.index));

            break;
          case "ptradd":
          case "free":
            // TODO: implement memory management
            // For now ignore and let heap always grow
            break;
          default:
            throw new Error(`emitWasm: instruction ${instr.op} not implemented yet`);
        }
      else {
        // label instruction
        // const lblInstr = instr as IBrilLabel;
        // ignore labels
      }
    });
  };

  // console.log("emitWasm: Function: ", func.name);
  emitBlock(blockArray[0]); // start emitting blocks

  const localCount = localsymbols.size;
  const locals = Array.from(localsymbols)
    .slice(func.args.length)
    .map(([key, value]) => encodeLocal(1, value.type));

  allSymbols[func.name] = Array.from(localsymbols.keys());

  return encodeVector([...encodeVector(locals), ...code, Opcodes.end]);
};

export const emitWasm: IWasmEmitter = (bril: IBrilProgram) => {
  if (Object.keys(bril.functions).length == 0) {
    throw new Error("Empty bril");
  }
  const cfg = cfgBuilder.buildProgram(bril);

  allSymbols = {};

  Object.values(libraryFunctions).forEach((libFunc) => {
    let found = false;
    for (let codeFunc of Object.values(bril.functions)) {
      for (let instr of codeFunc.instrs) {
        if ("op" in instr && instr.op == "call" && instr.funcs) {
          if (Object.keys(libraryFunctions).includes(instr.funcs[0])) {
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    libFunc.include = found;
  });

  let dataSection: number[];
  if (bril.data.size) {
    dataSection = createSection(Section.data, [
      ...unsignedLEB128(bril.data.size),
      ...flatten(
        Array.from(bril.data).map(([symbolvalue, symboldata]) => {
          // each data segment is 0, offset instruction, encodeVector(bytes)
          // offset instruction is constopcode(41), unsignedLEB(offset), end(0b)
          return [0, ...encodeConstI32_Signed(symboldata.offset), ...encodeVector(Array.from(symboldata.bytes))];
        })
      ),
    ]);
  } else dataSection = []; //createSection(Section.data, [0]);
  const dataSegmentSize = Array.from(bril.data).reduce((accum, cur) => (accum += cur[1].size), 0);

  // memory structure
  // 0--10239 = frame buffer
  // 10240-data.size = data section
  // 10240+data.size = heap_base
  const globals = {
    data_start: { index: 0, bytes: [Valtype.i32, Mutable.no, ...encodeConstI32_Signed(Offsets.data)] },
    heap_base: { index: 1, bytes: [Valtype.i32, Mutable.no, ...encodeConstI32_Signed(Offsets.data + dataSegmentSize)] },
    heap_pointer: { index: 2, bytes: [Valtype.i32, Mutable.yes, ...encodeConstI32_Signed(Offsets.data + dataSegmentSize)] },
  };

  // Function types are vectors of parameters and return types. Currently
  // WebAssembly only supports single return values
  // const printIntFunctionType = [functionType, ...encodeVector([Valtype.i32]), emptyArray]; // void print_int(int x);
  // const printStringFunctionType = [functionType, ...encodeVector([Valtype.i32]), emptyArray]; // void print_int(int x);
  // const setPixelFunctionType = [functionType, ...encodeVector([Valtype.f32, Valtype.f32, Valtype.f32]), emptyArray]; // void setPixel(float x, float y, float c)

  // TODO: optimise - some of the procs might have the same type signature
  const brilFunctions = Object.values(bril.functions);
  const codeFunctions = brilFunctions.map((proc) => [
    functionType,
    ...encodeVector(proc.args.map((arg) => Valtype[convertBrilToWasmType(arg.type)])),
    ...(proc.type && proc.type != "void" ? [1, Valtype[convertBrilToWasmType(proc.type)]] : [emptyArray]),
  ]);

  // the type section is a vector of function types
  const functionTypes = [
    ...importedFunctions.map((f) => [functionType, ...encodeVector(f.argTypes), ...(f.retType == 0 ? [0] : [1, f.retType])]),
    ...codeFunctions,
    ...Object.values(libraryFunctions)
      .filter((f) => f.include)
      .map((f) => [functionType, ...encodeVector(f.argTypes), ...(f.retType == 0 ? [0] : [1, f.retType])]),
  ];
  const typeSection = createSection(Section.type, encodeVector(functionTypes));

  // the function section is a vector of type indices that indicate the type of each function
  // in the code section
  const nonImportFunctionTypeIndexes = [
    ...brilFunctions.map((_, index) => importedFunctions.length + index),
    ...Object.values(libraryFunctions)
      .filter((f) => f.include)
      .map((_, index) => importedFunctions.length + brilFunctions.length + index),
  ];
  const funcSection = createSection(Section.func, encodeVector(nonImportFunctionTypeIndexes));

  // the import section is a vector of imported functions
  // const printFunctionImport = [
  //   ...encodeString("env"),
  //   ...encodeString("print_int"),
  //   ExportType.func,
  //   0x00, // type index
  // ];

  const memoryImport = [
    ...encodeString("env"),
    ...encodeString("memory"),
    ExportType.mem,
    /* limits https://webassembly.github.io/spec/core/binary/types.html#limits -
      indicates a min memory size of one page */
    0x00,
    0x01,
  ];

  const importSection = createSection(
    Section.import,
    encodeVector([
      ...importedFunctions.map((impfn, i) => [...encodeString("env"), ...encodeString(impfn.name), ExportType.func, i]),
      memoryImport,
    ])
  );

  // the export section is a vector of exported functions
  const exportSection = createSection(
    Section.export,
    encodeVector([
      ...brilFunctions.map((func, i) => [...encodeString(func.name), ExportType.func, i + importedFunctions.length]),
      [...encodeString("heap_pointer"), ExportType.global, 2],
    ])
  );

  // the code section contains vectors of functions
  const functionBodies = [
    ...brilFunctions.map((func) => emitWasmFunction(func, bril, cfg, globals)),
    ...Object.values(libraryFunctions)
      .filter((f) => f.include)
      .map((f) => f.emit()),
  ];
  const codeSection = createSection(Section.code, encodeVector(functionBodies));

  const globalsArray = Object.values(globals);
  const globalSection = createSection(Section.global, [...unsignedLEB128(globalsArray.length), ...flatten(globalsArray.map((g) => g.bytes))]);

  const encodeFunctionNames = (importedFnNames: string[], wasmFnNames: string[]) => {
    // structure
    // 1, size, N, 0, encodeString(name[0]), ..... N-1, encodeString(name[N-1])
    const res = [
      1, // function name section
      ...encodeVector([
        importedFnNames.length + wasmFnNames.length, // number of wasm functions + imported functions
        ...flatten(importedFnNames.map((fnName, i) => [i, ...encodeString(fnName)])),
        ...flatten(wasmFnNames.map((fnName, i) => [importedFnNames.length + i, ...encodeString(fnName)])),
      ]),
    ];
    return res;
  };

  const encodeLocalNames = (importedFnNames: string[]) => {
    // structure
    // 2, size, NumOfFunctions,
    // for each function:
    // ... FnIndex, NumOfLocalsInFnIndex, 0, encodeString(local0), 1, encodeString(local1) ....
    const res = [
      2,
      ...encodeVector([
        Object.keys(allSymbols).length + importedFnNames.length, // number of functions
        ..._.flattenDeep(importedFnNames.map((_, importedIndex) => [importedIndex, 0])),
        ..._.flattenDeep(
          Object.keys(allSymbols).map((fnName, i) => [
            importedFnNames.length + i, // function index
            allSymbols[fnName].length, // num of locals
            ...allSymbols[fnName].map((fnLocal, j) => [j, ...encodeString(fnLocal)]),
          ])
        ),
      ]),
    ];
    return res;
  };

  const nameSection = createSection(Section.custom, [
    ...encodeString("name"),
    ...encodeFunctionNames(
      importedFunctions.map((impfn) => "env." + impfn.name),
      Object.keys(bril.functions)
    ),
    ...encodeLocalNames([...importedFunctions.map((impfn) => "env." + impfn.name)]),
  ]);

  return Uint8Array.from([
    ...magicModuleHeader,
    ...moduleVersion,
    ...typeSection,
    ...importSection,
    ...funcSection,
    ...globalSection,
    ...exportSection,
    ...codeSection,
    ...dataSection,
    ...nameSection,
  ]);
};

export interface IWasmEmitter {
  (bril: IBrilProgram): Uint8Array;
}
