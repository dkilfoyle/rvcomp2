import { IAstProgram } from "../simpleC/ast";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { IBrilProgram } from "./BrilInterface";
import { lvn } from "./lvn";
import { blockMap2Instructions, cfgBuilder, getFunctionBlockMap, ICFG } from "./cfgBuilder";
import { runDCE } from "./dce";
import { removePhis, runSSA } from "./ssa";

export const optimiseBril = (
  bril: IBrilProgram,
  doSSA: boolean,
  keepPhis: boolean,
  doLVN: boolean = false,
  doDCE: boolean = false,
  log = false
) => {
  const getYN = (t: boolean) => (t ? "Y" : "N");
  const outBril: IBrilProgram = { functions: {} };
  const outCfg: ICFG = {};
  if (log) console.info(`Optimising: ${doSSA ? "SSA" : ""} ${doLVN ? "LVN" : ""} ${doDCE ? "DCE" : ""} `);
  Object.values(bril.functions).forEach((func) => {
    const blockMap = getFunctionBlockMap(func);

    if (doSSA) {
      const statsSSA = runSSA(blockMap, func);
      if (log) console.info(`${func.name}: SSA: `, statsSSA);
      if (!keepPhis) {
        const statsPhis = removePhis(blockMap);
        // if (log) console.info(`${func.name}: Phis: `, statsSSA);
      }
    }
    if (doLVN) {
      const lvnStats = lvn(blockMap);
      if (log) console.info(`${func.name}: LVN: `, lvnStats);
    }

    if (doDCE) {
      const statsDCE = runDCE(blockMap, func);
      if (log) console.info(`${func.name}: DCE: removed ${statsDCE.removedInstructions.length}`);
    }
    const instrs = blockMap2Instructions(blockMap);
    outBril.functions[func.name] = {
      ...func,
      instrs,
    };
    outCfg[func.name] = Object.values(blockMap);
  });
  return { optimBril: outBril, optimCfg: outCfg };
};
