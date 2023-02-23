import { IBrilArgument, IBrilType } from "../bril/BrilInterface";
import { allSymbols, convertBrilToWasmType } from "./brilToWasm";
import { unsignedLEB128, ieee754 } from "./encoding";
import { functionType, encodeVector, Valtype, emptyArray, Opcodes, encodeLocal } from "./wasm";

export const libraryFunctions = {
  set_pixel: {
    signature: [functionType, ...encodeVector([Valtype.f32, Valtype.f32, Valtype.f32, Valtype.f32, Valtype.f32]), ...[emptyArray]],
    include: false,
    emit: () => emitSetPixelFunction(),
  },
  get_pixel: {
    signature: [functionType, ...encodeVector([Valtype.i32, Valtype.i32]), ...[1, Valtype.i32]],
    include: false,
    emit: () => emitGetPixelFunction(),
  },
};

// ===========================================================================

const emitGetPixelFunction = () => {
  const code: number[] = [];
  const args: IBrilArgument[] = [
    { name: "x", type: "int" },
    { name: "y", type: "int" },
  ];
  const symbols = new Map<string, { index: number; type: Valtype }>(
    args.map((arg, index) => [arg.name, { index, type: Valtype[convertBrilToWasmType(arg.type)] }])
  );
  symbols.set("poffset", { index: 5, type: Valtype.i32 });

  const localIndexForSymbol = (name: string, type: IBrilType) => {
    if (!symbols.has(name)) {
      symbols.set(name, { index: symbols.size, type: Valtype[convertBrilToWasmType(type)] });
    }
    return symbols.get(name)!;
  };
  // compute the offset (y * 100 + x)*4
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("y", "float").index));
  code.push(Opcodes.f32_const, ...ieee754(100));
  code.push(Opcodes.f32_mul);

  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("x", "float").index));
  code.push(Opcodes.f32_add);

  // convert to an integer
  code.push(Opcodes.i32_trunc_f32_s);
  // shl 2 = * 4
  code.push(Opcodes.i32_const, ...unsignedLEB128(2));
  code.push(Opcodes.i32_shl);

  code.push(Opcodes.i32_load, 2, 0); // align and offset
  code.push(Opcodes.return);

  const localCount = symbols.size;
  // locals come after args
  const locals = Array.from(symbols)
    .slice(args.length)
    .map(([key, value]) => encodeLocal(1, value.type));

  allSymbols["get_pixel"] = Array.from(symbols.keys());

  return encodeVector([...encodeVector(locals), ...code, Opcodes.end]);
};

const emitSetPixelFunction = () => {
  const code: number[] = [];
  const args: IBrilArgument[] = [
    { name: "x", type: "float" },
    { name: "y", type: "float" },
    { name: "r", type: "float" },
    { name: "g", type: "float" },
    { name: "b", type: "float" },
  ];

  const symbols = new Map<string, { index: number; type: Valtype }>(
    args.map((arg, index) => [arg.name, { index, type: Valtype[convertBrilToWasmType(arg.type)] }])
  );
  symbols.set("poffset", { index: 5, type: Valtype.i32 });

  const localIndexForSymbol = (name: string, type: IBrilType) => {
    if (!symbols.has(name)) {
      symbols.set(name, { index: symbols.size, type: Valtype[convertBrilToWasmType(type)] });
    }
    return symbols.get(name)!;
  };

  // emit instructions

  // compute the offset (y * 100 + x)*4
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("y", "float").index));
  code.push(Opcodes.f32_const, ...ieee754(100));
  code.push(Opcodes.f32_mul);

  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("x", "float").index));
  code.push(Opcodes.f32_add);

  // convert to an integer
  code.push(Opcodes.i32_trunc_f32_s);
  // shl 2 = * 4
  code.push(Opcodes.i32_const, ...unsignedLEB128(2));
  code.push(Opcodes.i32_shl);

  // save in local $poffset
  // code.push(Opcodes.set_local, ...unsignedLEB128(localIndexForSymbol("poffset", "int").index));
  code.push(Opcodes.set_local, ...unsignedLEB128(5));

  // fetch the pixel offset
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("poffset", "int").index));
  // fetch red value and cast to int
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("r", "float").index));
  code.push(Opcodes.i32_trunc_f32_s);
  // write r
  code.push(Opcodes.i32_store_8, 0x00, 0x00); // align and offset

  // fetch the pixel offset
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("poffset", "int").index));
  // fetch red value and cast to int
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("g", "float").index));
  code.push(Opcodes.i32_trunc_f32_s);
  // write r
  code.push(Opcodes.i32_store_8, 0x00, 0x01); // align and offset

  // fetch the pixel offset
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("poffset", "int").index));
  // fetch red value and cast to int
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("b", "float").index));
  code.push(Opcodes.i32_trunc_f32_s);
  // write r
  code.push(Opcodes.i32_store_8, 0x00, 0x02); // align and offset

  // fetch the pixel offset
  code.push(Opcodes.get_local, ...unsignedLEB128(localIndexForSymbol("poffset", "int").index));
  // then push 255
  code.push(Opcodes.i32_const, ...unsignedLEB128(255));
  // then store at offset poffset+3
  code.push(Opcodes.i32_store, 0x00, 0x03); // align and offset

  const localCount = symbols.size;
  // locals come after args
  const locals = Array.from(symbols)
    .slice(args.length)
    .map(([key, value]) => encodeLocal(1, value.type));
  console.log(encodeVector(locals));

  allSymbols["set_pixel"] = Array.from(symbols.keys());
  console.log(allSymbols);

  return encodeVector([...encodeVector(locals), ...code, Opcodes.end]);
};
