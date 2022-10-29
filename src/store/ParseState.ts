import { CstNode } from "chevrotain";
import { useCallback, useMemo } from "react";
import { entity } from "simpler-state";
import { IBrilProgram } from "../languages/bril/BrilInterface";
import { brilPrinter } from "../languages/bril/BrilPrinter";
import { ICFG } from "../languages/bril/cfgBuilder";
import { IAstProgram } from "../languages/simpleC/ast";

// CST
export const cstEntity = entity({});
export const setCst = (newcst: CstNode) => {
  cstEntity.set(newcst);
};

// AST
export const astEntity = entity<IAstProgram>({ _name: "root", functionDeclarations: [] });
export const setAst = (newast: IAstProgram) => {
  astEntity.set(newast);
};

// Bril IR
export const brilIR = entity<IBrilProgram>({ functions: [] });
export const brilTxt = entity<string>("");
export const setBril = (newbril: IBrilProgram) => {
  brilIR.set(newbril);
  brilTxt.set(brilPrinter.print(newbril));
};

// CFG
export const cfg = entity(new Map() as ICFG);
export const selectedCfgNodeName = entity<string>("");
export const selectedFunctionName = entity<string>("main");

export const setCfg = (newcfg: ICFG) => {
  cfg.set(newcfg);
};

export const setSelectedCfgNodeName = (name: string) => {
  selectedCfgNodeName.set(name);
};
