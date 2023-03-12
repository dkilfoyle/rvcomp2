import {
  BrilTypeByteSize,
  IBrilArgument,
  IBrilFunction,
  IBrilInstruction,
  IBrilOpCode,
  IBrilOperation,
  IBrilParamType,
  IBrilPrimType,
  IBrilProgram,
  IBrilType,
} from "./BrilInterface";

let logger: Console;

class BriliError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = BriliError.name;
  }
}

function error(message: string): BriliError {
  return new BriliError(message);
}

let instrCount = 0;
let memory: DataView;
let heap_pointer: number = 0;
let heap_start: number = 0;
let data_start: number = 0;

export interface IHeapVar {
  address: number;
  type: IBrilPrimType;
  sizeInBytyes: number;
  endAddress: number;
  alive: boolean;
}
const heap: IHeapVar[] = [];

const argCounts: { [key in IBrilOpCode]: number | null } = {
  add: 2,
  mul: 2,
  sub: 2,
  div: 2,
  id: 1,
  lt: 2,
  le: 2,
  gt: 2,
  ge: 2,
  eq: 2,
  not: 1,
  and: 2,
  or: 2,
  fadd: 2,
  fmul: 2,
  fsub: 2,
  fdiv: 2,
  flt: 2,
  fle: 2,
  fgt: 2,
  fge: 2,
  feq: 2,
  print: null, // Any number of arguments.
  br: 1,
  jmp: 0,
  ret: null, // (Should be 0 or 1.)
  nop: 0,
  call: null,
  alloc: 1,
  free: 1,
  store: 2,
  load: 1,
  ptradd: 2,
  phi: null,
  // speculate: 0,
  // guard: 1,
  // commit: 0,
};

export type Pointer = {
  loc: number; //Key;
  type: IBrilType;
  size?: number;
};

type Value = boolean | BigInt | Pointer | number;
export type Env = Map<string, Value>;

function typeCheck(val: Value, typ: IBrilType): boolean {
  if (typ === "int") {
    return typeof val === "bigint" || Number.isInteger(val);
  } else if (typ === "bool") {
    return typeof val === "boolean";
  } else if (typ === "float") {
    return typeof val === "number";
  } else if (typeof typ === "object" && typ.hasOwnProperty("ptr")) {
    return val.hasOwnProperty("loc");
  } else if (typ == "char") {
    return typeof val === "bigint";
  }
  debugger;
  throw error(`unknown type ${typ}`);
}

function typeCmp(lhs: IBrilType, rhs: IBrilType): boolean {
  if (lhs === "int" || lhs == "bool" || lhs == "float" || lhs == "void" || lhs == "char") {
    return lhs == rhs;
  } else {
    if (typeof rhs === "object" && rhs.hasOwnProperty("ptr")) {
      return typeCmp(lhs.ptr, rhs.ptr);
    } else {
      return false;
    }
  }
}

function get(env: Env, ident: string) {
  let val = env.get(ident);
  if (typeof val === "undefined") {
    debugger;
    throw error(`undefined variable ${ident}`);
  }
  return val;
}

function checkArgs(instr: IBrilOperation, count: number) {
  let found = instr.args ? instr.args.length : 0;
  if (found != count) {
    throw error(`${instr.op} takes ${count} argument(s); got ${found}`);
  }
}

function getPtr(instr: IBrilOperation, env: Env, index: number): Pointer {
  let val = getArgument(instr, env, index);
  if (typeof val !== "object" || val instanceof BigInt) {
    throw `${instr.op} argument ${index} must be a Pointer`;
  }
  return val;
}

function getArgument(instr: IBrilOperation, env: Env, index: number, typ?: IBrilType) {
  let args = instr.args || [];
  if (args.length <= index) {
    throw error(`${instr.op} expected at least ${index + 1} arguments; got ${args.length}`);
  }
  let val = get(env, args[index]);
  if (typ && !typeCheck(val, typ)) {
    debugger;
    throw error(`${instr.op} argument ${index} must be a ${typ}`);
  }
  return val;
}

function getInt(instr: IBrilOperation, env: Env, index: number): bigint {
  return getArgument(instr, env, index, "int") as bigint;
}

function getBool(instr: IBrilOperation, env: Env, index: number): boolean {
  return getArgument(instr, env, index, "bool") as boolean;
}

function getFloat(instr: IBrilOperation, env: Env, index: number): number {
  return getArgument(instr, env, index, "float") as number;
}

function getLabel(instr: IBrilOperation, index: number): string {
  if (!instr.labels) {
    throw error(`missing labels; expected at least ${index + 1}`);
  }
  if (instr.labels.length <= index) {
    throw error(`expecting ${index + 1} labels; found ${instr.labels.length}`);
  }
  return instr.labels[index];
}

function getFunc(instr: IBrilOperation, index: number): string {
  if (!instr.funcs) {
    throw error(`missing functions; expected at least ${index + 1}`);
  }
  if (instr.funcs.length <= index) {
    throw error(`expecting ${index + 1} functions; found ${instr.funcs.length}`);
  }
  return instr.funcs[index];
}

// function alloc(ptrType: IBrilParamType, amt: number, heap: Heap<Value>): Pointer {
//   if (typeof ptrType != "object") {
//     throw error(`unspecified pointer type ${ptrType}`);
//   } else if (amt <= 0) {
//     throw error(`must allocate a positive amount of memory: ${amt} <= 0`);
//   } else {
//     let loc = heap.alloc(amt);
//     let dataType = ptrType.ptr;
//     return {
//       loc: loc,
//       type: dataType,
//     };
//   }
// }

function alloc(ptrType: IBrilParamType, amt: number, state: State): Pointer {
  if (typeof ptrType != "object") {
    throw error(`unspecified pointer type ${ptrType}`);
  } else if (amt <= 0) {
    throw error(`must allocate a positive amount of memory: ${amt} <= 0`);
  } else {
    const pointer = {
      loc: heap_pointer,
      type: ptrType.ptr,
      size: amt,
    };
    switch (ptrType.ptr) {
      case "int":
        if (heap_pointer + 4 * amt > memory.byteLength) throw new Error("Out of memeory");
        heap_pointer += 4 * amt;
        heap.push({ address: pointer.loc, type: "int", sizeInBytyes: 4 * amt, endAddress: pointer.loc + 4 * amt, alive: true });
        break;
      case "char":
        if (heap_pointer + amt > memory.byteLength) throw new Error("Out of memeory");
        heap_pointer += 1 * amt;
        heap.push({ address: pointer.loc, type: "char", sizeInBytyes: amt, endAddress: pointer.loc + amt, alive: true });
        break;
      default:
        throw new Error();
    }
    return pointer;
  }
}

type Action =
  | { action: "next" } // Normal execution: just proceed to next instruction.
  | { action: "jump"; label: string }
  | { action: "end"; ret: Value | null }
  | { action: "speculate" }
  | { action: "commit" }
  | { action: "abort"; label: string };
let NEXT: Action = { action: "next" };

type State = {
  env: Env;
  // readonly heap: Heap<Value>;
  readonly funcs: Record<string, IBrilFunction>;

  // For SSA (phi-node) execution: keep track of recently-seen labels.j
  curlabel: string | null;
  lastlabel: string | null;

  // For speculation: the state at the point where speculation began.
  specparent: State | null;
};

function evalCall(instr: IBrilOperation, state: State): Action {
  // Which function are we calling?
  let funcName = getFunc(instr, 0);

  // check if special function
  if (funcName == "print_int") {
    let args = instr.args || [];
    if (args.length !== 1) {
      throw error(`function expected 1 argument, got ${args.length}`);
    }
    let value = get(state.env, args[0]);
    if (!typeCheck(value, "int")) {
      throw error(`function argument type mismatch - expected int`);
    }
    logger.info(value);
    return NEXT;
  }

  if (funcName == "print_float") {
    let args = instr.args || [];
    if (args.length !== 1) {
      throw error(`function expected 1 argument, got ${args.length}`);
    }
    let value = get(state.env, args[0]);
    if (!typeCheck(value, "float")) {
      throw error(`function argument type mismatch - expected float`);
    }
    logger.info(value);
    return NEXT;
  }

  // check if special function
  if (funcName == "print_bool") {
    let args = instr.args || [];
    if (args.length !== 1) {
      throw error(`function expected 1 argument, got ${args.length}`);
    }
    let value = get(state.env, args[0]);
    if (!typeCheck(value, "bool")) {
      throw error(`function argument type mismatch - expected bool`);
    }
    logger.info(value);
    return NEXT;
  }

  if (funcName == "set_pixel") {
    let args = instr.args || [];
    if (args.length !== 5) {
      throw error(`function expected 5 arguments, got ${args.length}`);
    }
    let x = Number(get(state.env, args[0]));
    let y = Number(get(state.env, args[1]));
    let r = Number(get(state.env, args[2]));
    let g = Number(get(state.env, args[3]));
    let b = Number(get(state.env, args[4]));

    // if (!(typeCheck(x, "float") || typeCheck(x, "int") && typeCheck(y, "float") && typeCheck(c, "float"))) {
    //   throw error(`function argument type mismatch - expected bool`);
    // }

    // x = Number(x);
    // y = y as number;
    // r = r as number;
    // g = g as number;
    // b = b as number;

    let offset = (y * 100 + x) * 4;
    memory.setUint8(offset++, r);
    memory.setUint8(offset++, g);
    memory.setUint8(offset, b);

    return NEXT;
  }

  if (funcName == "get_pixel") {
    if ("dest" in instr) {
      let args = instr.args || [];
      if (args.length !== 2) {
        throw error(`function expected 2 arguments, got ${args.length}`);
      }
      let x = Number(get(state.env, args[0]));
      let y = Number(get(state.env, args[1]));
      let offset = (y * 100 + x) * 4;
      state.env.set(instr.dest, { loc: offset, type: "char" });
    }
    return NEXT;
  }

  if (funcName == "render") {
    console.error("render() not impleted");
    return NEXT;
  }

  if (funcName == "print_string") {
    let args = instr.args || [];
    if (args.length !== 1) {
      throw error(`function expected 1 argument, got ${args.length}`);
    }
    let value = get(state.env, args[0]);
    if (!typeCheck(value, "char")) {
      throw error(`function argument type mismatch - expected bigint`);
    }

    let str = "";
    for (let i = 0; i < 100; i++) {
      const byte = memory.getUint8(Number(value) + i);
      if (byte === 0) break;
      str += String.fromCharCode(byte);
    }

    logger.info(str);
    return NEXT;
  }

  let func = state.funcs[funcName];
  if (func === undefined) {
    throw error(`undefined function ${funcName}`);
  }

  let newEnv: Env = new Map();

  // Check arity of arguments and definition.
  let params = func.args || [];
  let args = instr.args || [];
  if (params.length !== args.length) {
    throw error(`function expected ${params.length} arguments, got ${args.length}`);
  }

  for (let i = 0; i < params.length; i++) {
    // Look up the variable in the current (calling) environment.
    let value = get(state.env, args[i]);

    // Check argument types
    if (!typeCheck(value, params[i].type)) {
      throw error(`function argument type mismatch`);
    }

    // Set the value of the arg in the new (function) environment.
    newEnv.set(params[i].name, value);
  }

  // Invoke the interpreter on the function.
  let newState: State = {
    env: newEnv,
    funcs: state.funcs,
    lastlabel: null,
    curlabel: null,
    specparent: null, // Speculation not allowed.
  };
  let retVal = evalFunc(func, newState);

  // Dynamically check the function's return value and type.
  if (!("dest" in instr)) {
    // `instr` is an `EffectOperation`.
    // Expected void function
    if (retVal !== null) {
      throw error(`unexpected value returned without destination`);
    }
    if (func.type !== "void") {
      throw error(`non-void function (type: ${func.type}) doesn't return anything`);
    }
  } else {
    // `instr` is a `ValueOperation`.
    // Expected non-void function
    if (instr.type === undefined) {
      throw error(`function call must include a type if it has a destination`);
    }
    if (instr.dest === undefined) {
      throw error(`function call must include a destination if it has a type`);
    }
    if (retVal === null) {
      throw error(`non-void function (type: ${func.type}) doesn't return anything`);
    }
    if (!typeCheck(retVal, instr.type)) {
      throw error(`type of value returned by function does not match destination type`);
    }
    if (func.type === undefined) {
      throw error(`function with void return type used in value call`);
    }
    if (!typeCmp(instr.type, func.type)) {
      throw error(`type of value returned by function does not match declaration`);
    }
    state.env.set(instr.dest, retVal);
  }
  return NEXT;
}

// eval instruction and return jmp label or "next" or "end"
function evalInstr(instr: IBrilInstruction, state: State): Action {
  instrCount += 1;

  // Check that we have the right number of arguments.
  if (instr.op !== "const") {
    let count = argCounts[instr.op];
    if (count === undefined) {
      throw error("unknown opcode " + instr.op);
    } else if (count !== null) {
      checkArgs(instr, count);
    }
  }

  // Function calls are not (currently) supported during speculation.
  // It would be cool to add, but aborting from inside a function call
  // would require explicit stack management.
  if (state.specparent && ["call", "ret"].includes(instr.op)) {
    throw error(`${instr.op} not allowed during speculation`);
  }

  switch (instr.op) {
    case "const":
      // Interpret JSON numbers as either ints or floats.
      let value: Value;
      if (typeof instr.value === "number") {
        if (instr.type === "float") value = instr.value;
        else value = BigInt(Math.floor(instr.value));
      } else if (typeof instr.value == "string") {
        throw new Error("String consts not implemented yet");
      } else value = instr.value;

      state.env.set(instr.dest, value);
      return NEXT;

    case "id": {
      let val = getArgument(instr, state.env, 0);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "add": {
      let val = getInt(instr, state.env, 0) + getInt(instr, state.env, 1);
      val = BigInt.asIntN(64, val);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "mul": {
      let val = getInt(instr, state.env, 0) * getInt(instr, state.env, 1);
      val = BigInt.asIntN(64, val);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "sub": {
      let val = getInt(instr, state.env, 0) - getInt(instr, state.env, 1);
      val = BigInt.asIntN(64, val);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "div": {
      let lhs = getInt(instr, state.env, 0);
      let rhs = getInt(instr, state.env, 1);
      if (rhs === BigInt(0)) {
        throw error(`division by zero`);
      }
      let val = lhs / rhs;
      val = BigInt.asIntN(64, val);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "le": {
      let val = getInt(instr, state.env, 0) <= getInt(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "lt": {
      let val = getInt(instr, state.env, 0) < getInt(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "gt": {
      let val = getInt(instr, state.env, 0) > getInt(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "ge": {
      let val = getInt(instr, state.env, 0) >= getInt(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "eq": {
      let val = Number(getInt(instr, state.env, 0)) === Number(getInt(instr, state.env, 1));
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "not": {
      let val = !getBool(instr, state.env, 0);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "and": {
      let val = getBool(instr, state.env, 0) && getBool(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "or": {
      let val = getBool(instr, state.env, 0) || getBool(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fadd": {
      let val = getFloat(instr, state.env, 0) + getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fsub": {
      let val = getFloat(instr, state.env, 0) - getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fmul": {
      let val = getFloat(instr, state.env, 0) * getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fdiv": {
      let val = getFloat(instr, state.env, 0) / getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fle": {
      let val = getFloat(instr, state.env, 0) <= getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "flt": {
      let val = getFloat(instr, state.env, 0) < getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fgt": {
      let val = getFloat(instr, state.env, 0) > getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "fge": {
      let val = getFloat(instr, state.env, 0) >= getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "feq": {
      let val = getFloat(instr, state.env, 0) === getFloat(instr, state.env, 1);
      state.env.set(instr.dest, val);
      return NEXT;
    }

    case "print": {
      let args = instr.args || [];
      let values = args.map(function (i) {
        let val = get(state.env, i);
        if (Object.is(-0, val)) {
          return "-0.00000000000000000";
        }
        if (typeof val == "number") {
          return val.toFixed(17);
        } else {
          return val.toString();
        }
      });
      logger.log(...values);
      return NEXT;
    }

    case "jmp": {
      return { action: "jump", label: getLabel(instr, 0) };
    }

    case "br": {
      let cond = getBool(instr, state.env, 0);
      if (cond) {
        return { action: "jump", label: getLabel(instr, 0) };
      } else {
        return { action: "jump", label: getLabel(instr, 1) };
      }
    }

    case "ret": {
      let args = instr.args || [];
      if (args.length == 0) {
        return { action: "end", ret: null };
      } else if (args.length == 1) {
        let val = get(state.env, args[0]);
        return { action: "end", ret: val };
      } else {
        throw error(`ret takes 0 or 1 argument(s); got ${args.length}`);
      }
    }

    case "nop": {
      return NEXT;
    }

    case "call": {
      return evalCall(instr, state);
    }

    case "alloc": {
      let amt = getInt(instr, state.env, 0);
      let typ = instr.type;
      if (!(typeof typ === "object" && typ.hasOwnProperty("ptr"))) {
        throw error(`cannot allocate non-pointer type ${instr.type}`);
      }
      let ptr = alloc(typ, Number(amt), state);
      state.env.set(instr.dest, ptr);
      return NEXT;
    }

    case "free": {
      let val = getPtr(instr, state.env, 0);
      const i = heap.findIndex((h) => h.address == val.loc);
      if (i !== -1) heap[i].alive = false;
      return NEXT;
    }

    case "store": {
      let target = getPtr(instr, state.env, 0);
      let val = getArgument(instr, state.env, 1, target.type);
      // state.heap.write(target.loc, getArgument(instr, state.env, 1, target.type));
      if (target.loc < 0 || target.loc >= memory.byteLength) throw new Error(`Pointer location ${target.loc} out of memory bounds`);
      switch (target.type) {
        case "int":
          memory.setUint32(target.loc, Number(val));
          // console.log(`Storing uint32 ${Number(val)} at ${target.loc}`);
          // console.log(`uint32 at ${target.loc / 4} now = ${memory.getUint32(target.loc)}`);
          break;
        case "char":
          memory.setUint8(target.loc, Number(val));
          break;
        default:
          throw new Error(`Store type ${target.type} not implemented`);
      }
      return NEXT;
    }

    case "load": {
      let ptr = getPtr(instr, state.env, 0);
      let loadval;
      switch (ptr.type) {
        case "int":
          loadval = memory.getUint32(ptr.loc);
          break;
        case "char":
          loadval = memory.getUint8(ptr.loc);
          break;
        default:
          throw new Error(`Load type ${ptr.type} not implemented`);
      }
      if (loadval === undefined || loadval === null) {
        throw error(`Pointer ${instr.args![0]} points to uninitialized data`);
      } else {
        state.env.set(instr.dest, loadval);
      }
      return NEXT;
    }

    case "ptradd": {
      let ptr = getPtr(instr, state.env, 0);
      let val = getInt(instr, state.env, 1);
      let byteSize = BrilTypeByteSize(ptr.type);
      state.env.set(instr.dest, { loc: ptr.loc + Number(val) * byteSize, type: ptr.type });
      return NEXT;
    }

    case "phi": {
      let labels = instr.labels || [];
      let args = instr.args || [];
      if (labels.length != args.length) {
        throw error(`phi node has unequal numbers of labels and args`);
      }
      if (!state.lastlabel) {
        throw error(`phi node executed with no last label`);
      }
      let idx = labels.indexOf(state.lastlabel);
      if (idx === -1) {
        // Last label not handled. Leave uninitialized.
        state.env.delete(instr.dest);
      } else {
        // Copy the right argument (including an undefined one).
        if (!instr.args || idx >= instr.args.length) {
          throw error(`phi node needed at least ${idx + 1} arguments`);
        }
        let src = instr.args[idx];
        let val = state.env.get(src);
        if (val === undefined) {
          state.env.delete(instr.dest);
        } else {
          state.env.set(instr.dest, val);
        }
      }
      return NEXT;
    }

    // Begin speculation.
    /* case "speculate": {
      return { action: "speculate" };
    }

    // Abort speculation if the condition is false.
    case "guard": {
      if (getBool(instr, state.env, 0)) {
        return NEXT;
      } else {
        return { action: "abort", label: getLabel(instr, 0) };
      }
    }

    // Resolve speculation, making speculative state real.
    case "commit": {
      return { action: "commit" };
    }*/
  }
}

function evalFunc(func: IBrilFunction, state: State): Value | null {
  for (let i = 0; i < func.instrs.length; ++i) {
    let line = func.instrs[i];
    if ("op" in line) {
      // Run an instruction.
      let action = evalInstr(line, state);

      // Take the prescribed action.
      switch (action.action) {
        case "end": {
          // Return from this function.
          return action.ret;
        }
        case "speculate": {
          // Begin speculation.
          state.specparent = { ...state };
          state.env = new Map(state.env);
          break;
        }
        case "commit": {
          // Resolve speculation.
          if (!state.specparent) {
            throw error(`commit in non-speculative state`);
          }
          state.specparent = null;
          break;
        }
        case "abort": {
          // Restore state.
          if (!state.specparent) {
            throw error(`abort in non-speculative state`);
          }
          // We do *not* restore `icount` from the saved state to ensure that we
          // count "aborted" instructions.
          Object.assign(state, {
            env: state.specparent.env,
            lastlabel: state.specparent.lastlabel,
            curlabel: state.specparent.curlabel,
            specparent: state.specparent.specparent,
          });
          break;
        }
        case "next":
        case "jump":
          break;
        default:
          throw error("unreachable");
      }
      // Move to a label.
      if ("label" in action) {
        // Search for the label and transfer control.
        for (i = 0; i < func.instrs.length; ++i) {
          let sLine = func.instrs[i];
          if ("label" in sLine && sLine.label === action.label) {
            --i; // Execute the label next.
            break;
          }
        }
        if (i === func.instrs.length) {
          throw error(`label ${action.label} not found`);
        }
      }
    } else if ("label" in line) {
      // Update CFG tracking for SSA phi nodes.
      state.lastlabel = state.curlabel;
      state.curlabel = line.label;
    }
  }

  // Reached the end of the function without hitting `ret`.
  if (state.specparent) {
    throw error(`implicit return in speculative state`);
  }
  return null;
}

function parseBool(s: string): boolean {
  if (s === "true") {
    return true;
  } else if (s === "false") {
    return false;
  } else {
    throw error(`boolean argument to main must be 'true'/'false'; got ${s}`);
  }
}

function parseNumber(s: string): number {
  let f = parseFloat(s);
  if (!isNaN(f)) {
    return f;
  } else {
    throw error(`float argument to main must not be 'NaN'; got ${s}`);
  }
}

function parseMainArguments(expected: IBrilArgument[], args: string[]): Env {
  let newEnv: Env = new Map();

  if (args.length !== expected.length) {
    throw error(`mismatched main argument arity: expected ${expected.length}; got ${args.length}`);
  }

  for (let i = 0; i < args.length; i++) {
    let type = expected[i].type;
    switch (type) {
      case "int":
        let n: bigint = BigInt(parseInt(args[i]));
        newEnv.set(expected[i].name, n as Value);
        break;
      case "float":
        let f: number = parseNumber(args[i]);
        newEnv.set(expected[i].name, f as Value);
        break;
      case "bool":
        let b: boolean = parseBool(args[i]);
        newEnv.set(expected[i].name, b as Value);
        break;
    }
  }
  return newEnv;
}

function evalProg(prog: IBrilProgram, args: string[]) {
  // let heap = new Heap<Value>();

  // memory is 64k
  // screen is 0..40000
  // data is 40960....40960+datasize-1
  // heap is 40960+datasize....
  memory = new DataView(new Uint8Array(64 * 1024).buffer);
  data_start = 40960;
  heap_start = 40960;

  prog.data.forEach((data) => {
    data.bytes.forEach((byte, i) => memory.setUint8(data.offset + i, byte));
    heap_start += data.bytes.length;
  });
  heap_pointer = heap_start;

  let main = prog.functions.main;
  if (!main || main === null) {
    logger.warn(`no main function defined, doing nothing`);
    return { result: 0, state: { icount: 0, env: new Map(), heap: [] } };
  }

  // Silly argument parsing to find the `-p` flag.
  let profiling = false;
  let pidx = args.indexOf("-p");
  if (pidx > -1) {
    profiling = true;
    args.splice(pidx, 1);
  }

  // Remaining arguments are for the main function.k
  let expected = main.args || [];
  let newEnv = parseMainArguments(expected, args);

  let state: State = {
    funcs: prog.functions,
    env: newEnv,
    lastlabel: null,
    curlabel: null,
    specparent: null,
  };
  heap.length = 0;
  const result = evalFunc(main, state);

  // if (!heap.isEmpty()) {
  //   throw error(`Some memory locations have not been freed by end of execution.`);
  // }
  if (heap.some((h) => h.alive)) logger.warn(`Heap is not empty - ${heap.length} entries remain`);

  return { result, state };
}

export function runInterpretor(prog: IBrilProgram, args: string[], consoleLogger: Console, outputLogger: Console, optimLevel = "Unknown") {
  logger = outputLogger;
  try {
    consoleLogger.info(`Running ${optimLevel}...`);
    const startTime = performance.now();
    const { result, state } = evalProg(prog, args);
    const endTime = performance.now();
    if (result != null) logger.info(`Returned ${result}`);
    consoleLogger.info(` - Completed ${instrCount} instructions in ${(endTime - startTime).toFixed(1)}ms`);
    console.log("State.env: ", state.env);
    return { memory, env: state.env, data_start, heap_start, heap_pointer, heap, data: prog.data };
  } catch (e) {
    if (e instanceof BriliError) {
      logger.error(`error: ${e.message}`);
    } else {
      throw e;
    }
    return { memory, env: new Map(), data_start, heap_start, heap_pointer, heap: [], data: prog.data };
  }
}
