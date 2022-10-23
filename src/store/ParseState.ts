import { CstNode } from "chevrotain";
import { entity } from "simpler-state";
import { IAstProgram } from "../languages/simpleC/ast";
import { IBrilProgram } from "../languages/simpleC/astToBrilVisitor";

export const cstEntity = entity({});
export const astEntity = entity<IAstProgram>({ _name: "root", functionDeclarations: [] });
export const brilEntity = entity<IBrilProgram>({ functions: [] });

export const setCst = (newcst: CstNode) => {
  cstEntity.set(newcst);
};

export const setAst = (newast: IAstProgram) => {
  astEntity.set(newast);
};

export const setBril = (newbril: IBrilProgram) => {
  brilEntity.set(newbril);
};
