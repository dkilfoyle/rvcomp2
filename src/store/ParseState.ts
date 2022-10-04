import { CstNode } from "chevrotain";
import { entity } from "simpler-state";

export const cstEntity = entity({});
export const astEntity = entity({});

export const setCst = (newcst: CstNode) => {
  cstEntity.set(newcst);
};

export const setAst = (newast: Record<string, unknown>) => {
  astEntity.set(newast);
};
