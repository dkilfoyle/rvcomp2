import { IPos } from "../simpleC/ast";

export const BrilTypeByteSize = (type: IBrilType) => {
  if (typeof type == "object") throw new Error("BrilTypeByteSize: can't size pointer");
  if (type == "void") throw new Error("BrilTypeByteSize: can't size void");
  switch (type) {
    case "int":
    case "float":
      return 4;
    case "char":
    case "bool":
      return 1;
    default:
      throw new Error("BrilTypeByteSize: unknown type");
  }
};

export type IBrilValueType = number | boolean | string;
export type IBrilPrimType = "int" | "bool" | "float" | "char";
export type IBrilParamType = { ptr: IBrilType };
export type IBrilType = IBrilPrimType | IBrilParamType | "void";

export interface IBrilOp extends IBrilNode {
  args?: string[];
  funcs?: string[];
  labels?: string[];
  pos?: IPos;
}

export interface IBrilEffectOperation extends IBrilOp {
  op: "br" | "jmp" | "ret" | "call" | "print" | "free" | "store";
}

export interface IBrilValueOperation extends IBrilOp {
  op:
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "mod"
    | "fadd"
    | "fsub"
    | "fmul"
    | "fdiv"
    | "fmod"
    | "call"
    | "id"
    | "nop"
    | "phi"
    | "eq"
    | "lt"
    | "gt"
    | "ge"
    | "le"
    | "feq"
    | "flt"
    | "fgt"
    | "fge"
    | "fle"
    | "not"
    | "and"
    | "or"
    | "load"
    | "ptradd"
    | "alloc"
    | "ftosit"
    | "sittof";
  dest: string;
  type: IBrilType;
  args: string[];
}

export type IBrilValueOpCode = IBrilValueOperation["op"];
export type IBrilEffectOpCode = IBrilEffectOperation["op"];
export type IBrilOpCode = IBrilValueOpCode | IBrilEffectOpCode;

export interface IBrilConst extends IBrilNode {
  op: "const";
  value: IBrilValueType;
  dest: string;
  type: IBrilType;
  pos?: IPos;
}

export type IBrilOperation = IBrilValueOperation | IBrilEffectOperation;
export type IBrilInstruction = IBrilOperation | IBrilConst;
export type IBrilValueInstruction = IBrilConst | IBrilValueOperation;
export type IBrilInstructionOrLabel = IBrilInstruction | IBrilLabel;

export interface IBrilLabel extends IBrilNode {
  label: string;
  pos?: IPos;
}

export interface IBrilArgument {
  name: string;
  type: IBrilType;
}

export interface IBrilFunction extends IBrilNode {
  name: string;
  args: IBrilArgument[];
  type?: IBrilType;
  instrs: (IBrilInstruction | IBrilLabel)[];
  pos?: IPos;
}

export interface IBrilNode {
  key?: number;
}

export interface IBrilDataItem {
  offset: number;
  size: number;
  bytes: Uint8Array;
  type: string;
  value: any;
  name: string;
}
export type IBrilDataSegment = Map<string, IBrilDataItem>;

export interface IBrilProgram extends IBrilNode {
  functions: Record<string, IBrilFunction>;
  data: IBrilDataSegment;
  dataSize: number;
}
