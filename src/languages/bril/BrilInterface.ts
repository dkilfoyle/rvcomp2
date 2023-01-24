import { IPos } from "../simpleC/ast";

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
    | "fadd"
    | "fsub"
    | "fmul"
    | "fdiv"
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
    | "alloc";
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

export type IBrilDataSegment = Map<string, { offset: number; size: number; bytes: Uint8Array }>;

export interface IBrilProgram extends IBrilNode {
  functions: Record<string, IBrilFunction>;
  data: IBrilDataSegment;
  dataSize: number;
}
