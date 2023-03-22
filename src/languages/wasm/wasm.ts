import { unsignedLEB128 } from "./encoding";

export const flatten = (arr: any[]) => [].concat.apply([], arr);

// https://webassembly.github.io/spec/core/binary/modules.html#sections
export enum Section {
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
export enum Valtype {
  i32 = 0x7f, //127
  f32 = 0x7d, //125
  void = 0x0,
}

export enum Mutable {
  no = 0,
  yes = 1,
}

// https://webassembly.github.io/spec/core/binary/types.html#binary-blocktype
export enum Blocktype {
  void = 0x40,
}

export type IWasmOpCode =
  | "block"
  | "loop"
  | "if"
  | "else"
  | "br"
  | "br_if"
  | "end"
  | "return"
  | "call"
  | "get_local"
  | "set_local"
  | "get_global"
  | "set_global"
  | "i32_load"
  | "i32_load8_s"
  | "i32_load8_u"
  | "i32_store_8"
  | "i32_store"
  | "f32_store"
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
  | "i32_rem"
  | "f32_add"
  | "f32_sub"
  | "f32_mul"
  | "f32_div"
  | "i32_trunc_f32_s"
  | "i32_shl"
  | "drop";

// https://webassembly.github.io/spec/core/binary/instructions.html
export const Opcodes: Record<IWasmOpCode, number> = {
  block: 0x02,
  loop: 0x03,
  if: 0x04,
  else: 0x05,
  br: 0x0c,
  br_if: 0x0d,
  return: 0x0f,
  end: 0x0b,
  call: 0x10,
  drop: 0x1a,
  // locals
  get_local: 0x20,
  set_local: 0x21,
  get_global: 0x23,
  set_global: 0x24,

  // memory
  i32_load: 0x28,
  i32_load8_s: 0x2c,
  i32_load8_u: 0x2d,
  i32_store_8: 0x3a,
  i32_store: 0x36,
  f32_store: 0x38,
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
  i32_rem: 0x6f,

  i32_shl: 0x74,

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
export enum ExportType {
  func = 0x00,
  table = 0x01,
  mem = 0x02,
  global = 0x03,
}

// http://webassembly.github.io/spec/core/binary/types.html#function-types
export const functionType = 0x60;

export const emptyArray = 0x0;

// https://webassembly.github.io/spec/core/binary/modules.html#binary-module
export const magicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
export const moduleVersion = [0x01, 0x00, 0x00, 0x00];

// https://webassembly.github.io/spec/core/binary/conventions.html#binary-vec
// Vectors are encoded with their length followed by their element sequence
export const encodeVector = (data: any[]) => [...unsignedLEB128(data.length), ...flatten(data)];

// https://webassembly.github.io/spec/core/binary/modules.html#code-section
export const encodeLocal = (count: number, type: Valtype) => [...unsignedLEB128(count), type];

// https://webassembly.github.io/spec/core/binary/modules.html#sections
// sections are encoded by their type followed by their vector contents
export const createSection = (sectionType: Section, data: any[]) => [sectionType, ...encodeVector(data)];

// ===========================================================================
