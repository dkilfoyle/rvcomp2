import { parseArgs } from "util";
import { IBrilFunction, IBrilProgram } from "./BrilInterface";

export type IDictStrings = Record<string, string[]>;
export type IDictString = Record<string, string>;

export const getBrilFunctionArgs = (func: IBrilFunction) => {
  if (func.args) return func.args.map((a) => a.name);
  else return [];
};

export const getBrilFunctionVarTypes = (func: IBrilFunction) => {
  const types: IDictString = {};
  func.args?.forEach((arg) => {
    types[arg.name] = arg.type as string;
  });
  func.instrs.forEach((instr) => {
    if ("dest" in instr) types[instr.dest] = instr.type as string;
  });
  return types;
};
