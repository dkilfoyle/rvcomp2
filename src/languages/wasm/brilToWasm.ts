// adapted from https://github.com/ColinEberhardt/chasm

import { IBrilFunction, IBrilInstruction, IBrilInstructionOrLabel, IBrilProgram, IBrilType } from "../bril/BrilInterface";
import { unsignedLEB128, signedLEB128, encodeString, ieee754 } from "./encoding";

const convertBrilToWasmType = (type: IBrilType) => {
  switch (type) {
    case "int":
      return "i32";
    case "float":
      return "f32";
    case "bool":
      return "i32";
    case "void":
      throw new Error();
    default:
      throw new Error();
  }
};

const flatten = (arr: any[]) => [].concat.apply([], arr);

// https://webassembly.github.io/spec/core/binary/modules.html#sections
enum Section {
  custom = 0,
  type = 1,
  import = 2,
  func = 3,
  table = 4,
  memory = 5,
  global = 6,
  export = 7,
  start = 8,
  element = 9,
  code = 10,
  data = 11,
}

// https://webassembly.github.io/spec/core/binary/types.html
enum Valtype {
  i32 = 0x7f,
  f32 = 0x7d,
}

// https://webassembly.github.io/spec/core/binary/types.html#binary-blocktype
enum Blocktype {
  void = 0x40,
}

type IWasmOpCode =
  | "block"
  | "loop"
  | "br"
  | "br_if"
  | "end"
  | "call"
  | "get_local"
  | "set_local"
  | "i32_store_8"
  | "i32_const"
  | "f32_const"
  | "i32_eqz"
  | "i32_eq"
  | "i32_lt"
  | "i32_gt"
  | "i32_le"
  | "i32_ge"
  | "f32_lt"
  | "f32_gt"
  | "f32_le"
  | "f32_ge"
  | "f32_eq"
  | "i32_and"
  | "i32_or"
  | "i32_add"
  | "i32_sub"
  | "i32_mul"
  | "i32_div"
  | "f32_add"
  | "f32_sub"
  | "f32_mul"
  | "f32_div"
  | "i32_trunc_f32_s";

// https://webassembly.github.io/spec/core/binary/instructions.html
const Opcodes: Record<IWasmOpCode, number> = {
  block: 0x02,
  loop: 0x03,
  br: 0x0c,
  br_if: 0x0d,
  end: 0x0b,
  call: 0x10,
  // locals
  get_local: 0x20,
  set_local: 0x21,
  i32_store_8: 0x3a,
  // numeric
  i32_const: 0x41,
  f32_const: 0x43,
  i32_eqz: 0x45,
  i32_eq: 0x46,
  // i32 signed comparison
  i32_lt: 0x48,
  i32_gt: 0x4a,
  i32_le: 0x4c,
  i32_ge: 0x4e,
  // f32 comparison
  f32_lt: 0x5d,
  f32_gt: 0x5e,
  f32_le: 0x5f,
  f32_ge: 0x60,

  f32_eq: 0x5b,
  // i32 logical
  i32_and: 0x71,
  i32_or: 0x72,
  // i32 arthimetic
  i32_add: 0x6a,
  i32_sub: 0x6b,
  i32_mul: 0x6c,
  i32_div: 0x6d,
  // f32 arthimetic
  f32_add: 0x92,
  f32_sub: 0x93,
  f32_mul: 0x94,
  f32_div: 0x95,
  i32_trunc_f32_s: 0xa8,
};

const binaryOpcode = {
  float: {
    add: Opcodes.f32_add,
    sub: Opcodes.f32_sub,
    mul: Opcodes.f32_mul,
    div: Opcodes.f32_div,
    eq: Opcodes.f32_eq,
    gt: Opcodes.f32_gt,
    lt: Opcodes.f32_lt,
  },
  int: {
    "&&": Opcodes.i32_and,
  },
};

// http://webassembly.github.io/spec/core/binary/modules.html#export-section
enum ExportType {
  func = 0x00,
  table = 0x01,
  mem = 0x02,
  global = 0x03,
}

// http://webassembly.github.io/spec/core/binary/types.html#function-types
const functionType = 0x60;

const emptyArray = 0x0;

// https://webassembly.github.io/spec/core/binary/modules.html#binary-module
const magicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
const moduleVersion = [0x01, 0x00, 0x00, 0x00];

// https://webassembly.github.io/spec/core/binary/conventions.html#binary-vec
// Vectors are encoded with their length followed by their element sequence
const encodeVector = (data: any[]) => [...unsignedLEB128(data.length), ...flatten(data)];

// https://webassembly.github.io/spec/core/binary/modules.html#code-section
const encodeLocal = (count: number, type: Valtype) => [...unsignedLEB128(count), type];

// https://webassembly.github.io/spec/core/binary/modules.html#sections
// sections are encoded by their type followed by their vector contents
const createSection = (sectionType: Section, data: any[]) => [sectionType, ...encodeVector(data)];

// ===========================================================================

const emitWasmFunction = (func: IBrilFunction, program: IBrilProgram) => {
  const code: number[] = [];

  const symbols = new Map<string, { index: number; type: Valtype }>(
    func.args.map((arg, index) => [arg.name, { index, type: Valtype[convertBrilToWasmType(arg.type)] }])
  );

  const localIndexForSymbol = (name: string, type: IBrilType) => {
    if (!symbols.has(name)) {
      symbols.set(name, { index: symbols.size, type: Valtype[convertBrilToWasmType(type)] });
    }
    return symbols.get(name)!;
  };

  const emitInstructions = (instructions: IBrilInstructionOrLabel[]) =>
    instructions.forEach((instr) => {
      if ("op" in instr)
        switch (instr.op) {
          case "const":
            const consttype = convertBrilToWasmType(instr.type);
            const constopcode = `${consttype}_const` as IWasmOpCode;
            const constdest = localIndexForSymbol(instr.dest, instr.type).index;
            code.push(Opcodes[constopcode]);
            code.push(...(consttype == "f32" ? ieee754(Number(instr.value)) : signedLEB128(Number(instr.value))));
            code.push(Opcodes.set_local);
            code.push(...unsignedLEB128(constdest));
            console.log(`(set_local ${constdest} (${constopcode} ${instr.value}))`);
            break;
          // integer binary numeric operations
          case "add":
          case "sub":
          case "mul":
          case "div":
          // binary comparison operations
          case "lt":
          case "le":
          case "gt":
          case "ge":
          case "eq":
          // float binary numeric operations
          case "fadd":
          case "fsub":
          case "fmul":
          case "fdiv":
          // float comparison operations
          case "flt":
          case "fle":
          case "fgt":
          case "fge":
          case "feq":
            const binInstrType = instr.type;
            const binarg0 = localIndexForSymbol(instr.args[0], binInstrType).index;
            code.push(Opcodes.get_local);
            code.push(...unsignedLEB128(binarg0));

            const binarg1 = localIndexForSymbol(instr.args[1], binInstrType).index;
            code.push(Opcodes.get_local);
            code.push(...unsignedLEB128(binarg1));

            const binopcode = binInstrType == "int" ? (`i32_${instr.op}` as IWasmOpCode) : (`f32_${instr.op.slice(1)}` as IWasmOpCode);
            code.push(Opcodes[binopcode]);
            console.log(`(${binopcode} ${binarg0} ${binarg1})`);

            const bindest = localIndexForSymbol(instr.dest, binInstrType).index;
            code.push(Opcodes.set_local);
            code.push(...unsignedLEB128(bindest));
            console.log(`(set_local ${bindest})`);
            break;
          case "id":
            const idinstrtype = instr.type;
            const idrhsIndex = localIndexForSymbol(instr.args[0], idinstrtype).index;
            const idlhsIndex = localIndexForSymbol(instr.dest, idinstrtype).index;

            code.push(Opcodes.get_local);
            code.push(...unsignedLEB128(idrhsIndex));
            console.log(`(get_local ${idrhsIndex})`);

            code.push(Opcodes.set_local);
            code.push(...unsignedLEB128(idlhsIndex));
            console.log(`(set_local ${idlhsIndex})`);
            break;
          // case "whileStatement":
          //   // outer block
          //   code.push(Opcodes.block);
          //   code.push(Blocktype.void);
          //   // inner loop
          //   code.push(Opcodes.loop);
          //   code.push(Blocktype.void);
          //   // compute the while expression
          //   emitExpression(statement.expression);
          //   code.push(Opcodes.i32_eqz);
          //   // br_if $label0
          //   code.push(Opcodes.br_if);
          //   code.push(...signedLEB128(1));
          //   // the nested logic
          //   emitStatements(statement.statements);
          //   // br $label1
          //   code.push(Opcodes.br);
          //   code.push(...signedLEB128(0));
          //   // end loop
          //   code.push(Opcodes.end);
          //   // end block
          //   code.push(Opcodes.end);
          //   break;
          // case "ifStatement":
          //   // if block
          //   code.push(Opcodes.block);
          //   code.push(Blocktype.void);
          //   // compute the if expression
          //   emitExpression(statement.expression);
          //   code.push(Opcodes.i32_eqz);
          //   // br_if $label0
          //   code.push(Opcodes.br_if);
          //   code.push(...signedLEB128(0));
          //   // the nested logic
          //   emitStatements(statement.consequent);
          //   // end block
          //   code.push(Opcodes.end);

          //   // else block
          //   code.push(Opcodes.block);
          //   code.push(Blocktype.void);
          //   // compute the if expression
          //   emitExpression(statement.expression);
          //   code.push(Opcodes.i32_const);
          //   code.push(...signedLEB128(1));
          //   code.push(Opcodes.i32_eq);
          //   // br_if $label0
          //   code.push(Opcodes.br_if);
          //   code.push(...signedLEB128(0));
          //   // the nested logic
          //   emitStatements(statement.alternate);
          //   // end block
          //   code.push(Opcodes.end);
          //   break;
          case "call":
            if (!instr.funcs) throw Error();
            const funcName = instr.funcs[0];
            // TODO: allow for >1 imported function
            const callFuncIndex = funcName == "print_int" ? 0 : Object.keys(program.functions).findIndex((f) => f === funcName) + 1;
            const argIndexes = instr.args?.map((arg) => symbols.get(arg)!.index);
            argIndexes?.forEach((argIndex) => {
              if (!argIndex) throw Error();
              code.push(Opcodes.get_local);
              code.push(...unsignedLEB128(argIndex));
            });
            code.push(Opcodes.call);
            code.push(...unsignedLEB128(callFuncIndex));

            const argIndexesString = argIndexes?.map((i) => `(get_local ${i})`);
            console.log(`(call ${callFuncIndex} ${argIndexesString})`);
            break;
          case "ret":
            console.log("ret not implemented");
            // throw new Error();
            break;
          default:
            throw new Error(`emitWasm: instruction ${instr.op} not implemented yet`);
        }
      else {
        // label instruction
        // debugger;
        // throw new Error(`emitWasm: labels not implemented yet`);
      }
    });

  emitInstructions(func.instrs);

  const localCount = symbols.size;
  const locals = Array.from(symbols).map(([key, value]) => encodeLocal(1, value.type));

  return encodeVector([...encodeVector(locals), ...code, Opcodes.end]);
};

export const emitWasm: IWasmEmitter = (bril: IBrilProgram) => {
  // Function types are vectors of parameters and return types. Currently
  // WebAssembly only supports single return values
  const printFunctionType = [functionType, ...encodeVector([Valtype.i32]), emptyArray];

  // TODO: optimise - some of the procs might have the same type signature
  const brilFunctions = Object.values(bril.functions);
  const funcTypes = brilFunctions.map((proc) => [
    functionType,
    ...encodeVector(proc.args.map((arg) => convertBrilToWasmType(arg.type))),
    emptyArray,
  ]);

  // the type section is a vector of function types
  const typeSection = createSection(Section.type, encodeVector([printFunctionType, ...funcTypes]));

  // the function section is a vector of type indices that indicate the type of each function
  // in the code section
  const funcSection = createSection(Section.func, encodeVector(brilFunctions.map((_, index) => index + 1 /* type index */)));

  // the import section is a vector of imported functions
  const printFunctionImport = [
    ...encodeString("env"),
    ...encodeString("print_int"),
    ExportType.func,
    0x00, // type index
  ];

  const memoryImport = [
    ...encodeString("env"),
    ...encodeString("memory"),
    ExportType.mem,
    /* limits https://webassembly.github.io/spec/core/binary/types.html#limits -
      indicates a min memory size of one page */
    0x00,
    0x01,
  ];

  const importSection = createSection(Section.import, encodeVector([printFunctionImport, memoryImport]));

  // the export section is a vector of exported functions
  const exportSection = createSection(
    Section.export,
    encodeVector(brilFunctions.map((func, i) => [...encodeString(func.name), ExportType.func, i + 1]))
  );

  // the code section contains vectors of functions
  const codeSection = createSection(Section.code, encodeVector(brilFunctions.map((func) => emitWasmFunction(func, bril))));

  return Uint8Array.from([
    ...magicModuleHeader,
    ...moduleVersion,
    ...typeSection,
    ...importSection,
    ...funcSection,
    ...exportSection,
    ...codeSection,
  ]);
};

export interface IWasmEmitter {
  (bril: IBrilProgram): Uint8Array;
}
