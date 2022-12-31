import { IPos } from "../simpleC/ast";

export type IBrilValueType = number | boolean;
export type IBrilPrimType = "int" | "bool" | "float";
export type IBrilParamType = { ptr: IBrilType };
export type IBrilType = IBrilPrimType | IBrilParamType | "void";

export interface IBrilOp extends IBrilNode {
  args?: string[];
  funcs?: string[];
  labels?: string[];
  pos?: IPos;
}

export interface IBrilEffectOperation extends IBrilOp {
  op: "br" | "jmp" | "ret" | "call" | "print" | "free";
}

export interface IBrilValueOperation extends IBrilOp {
  op:
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "call"
    | "id"
    | "nop"
    | "phi"
    | "eq"
    | "lt"
    | "gt"
    | "ge"
    | "le"
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
  args?: IBrilArgument[];
  type?: IBrilType;
  instrs: (IBrilInstruction | IBrilLabel)[];
  pos?: IPos;
}

export interface IBrilNode {
  key?: number;
}

export interface IBrilProgram extends IBrilNode {
  functions: Record<string, IBrilFunction>;
}
