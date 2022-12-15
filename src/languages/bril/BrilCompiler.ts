import { setAst, setBril, setCfg } from "../../store/parseSlice";
import store from "../../store/store";
import { IAstProgram } from "../simpleC/ast";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { IBrilProgram } from "./BrilInterface";
import { runDCE } from "./BrilOptimiser";
import { blockMap2Instructions, cfgBuilder, getFunctionBlockMap } from "./cfgBuilder";
import { removePhis, runSSA } from "./ssa";

type IValidSimpleCCompilers = "bril";

export const compileSimpleC = (ast: IAstProgram, compiler: IValidSimpleCCompilers) => {
  switch (compiler) {
    case "bril":
      const bril = astToBrilVisitor.visit(ast);
      const cfg = cfgBuilder.buildProgram(bril);
      store.dispatch(setAst(ast));
      store.dispatch(setBril(bril));
      store.dispatch(setCfg(cfg));
      break;
    default:
      throw new Error();
  }
};

export const optimiseBril = (bril: IBrilProgram, doSSA: boolean, keepPhis: boolean, doLVN: boolean = false, doDCE: boolean = false) => {
  const getYN = (t: boolean) => (t ? "Y" : "N");
  const outBril: IBrilProgram = { functions: {} };
  console.info(`Optimising: ${doSSA ? "SSA" : ""} ${doLVN ? "LVN" : ""} ${doDCE ? "DCE" : ""} `);
  Object.values(bril.functions).forEach((func) => {
    const blockMap = getFunctionBlockMap(func);
    if (doSSA) {
      const statsSSA = runSSA(blockMap, func);
      console.info(`${func.name}: SSA: `, statsSSA);
      if (!keepPhis) {
        const statsPhis = removePhis(blockMap);
        console.info(`${func.name}: Phis: `, statsSSA);
      }
    }
    // if (doLVN) runLVN(blockMap);
    if (doDCE) {
      const statsDCE = runDCE(blockMap, func);
      console.info(`${func.name}: DCE: `, statsDCE);
    }
    const instrs = blockMap2Instructions(blockMap);
    outBril.functions[func.name] = {
      ...func,
      instrs,
    };
  });
  return outBril;
};
