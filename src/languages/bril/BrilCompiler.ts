import { IAstProgram } from "../simpleC/ast";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { IBrilProgram, IBrilDataSegment } from "./BrilInterface";
import { lvn } from "./lvn";
import { blockMap2Instructions, cfgBuilder, getFunctionBlockMap, ICFG } from "./cfgBuilder";
import { runDCE } from "./dce";
import { removePhis, runSSA } from "./ssa";
import { gvn } from "./gvn";

export const optimiseBril = (
  bril: IBrilProgram,
  doSSA: boolean,
  keepPhis: boolean,
  doLVN: boolean = false,
  doGVN: boolean = false,
  doDCE: boolean = false,
  log = false
) => {
  const getYN = (t: boolean) => (t ? "Y" : "N");
  const outBril: IBrilProgram = { functions: {}, data: new Map(), dataSize: 0 };
  const outCfg: ICFG = {};
  // if (log && Object.keys(bril.functions).length > 0) console.info(`Optimising: SSA:${doSSA}, LVN:${doLVN}, DCE:${doDCE}`);
  Object.values(bril.functions).forEach((func) => {
    const blockMap = getFunctionBlockMap(func);

    if (Object.keys(blockMap).length > 0) {
      if (log) console.info("Optimising...");
      if (doSSA) {
        const statsSSA = runSSA(blockMap, func);
        if (log) console.info(`${func.name}: SSA: `, statsSSA);
      }

      if (doLVN) {
        const lvnStats = lvn(blockMap);
        if (log) console.info(`${func.name}: LVN: `, lvnStats);
      }

      if (doGVN) {
        const gvnStats = gvn(func, blockMap);
        if (log) console.info(`${func.name}: LVN: `, gvnStats);
      }

      if (!keepPhis) {
        const statsPhis = removePhis(blockMap);
        // if (log) console.info(`${func.name}: Phis: `, statsSSA);
      }

      if (doDCE) {
        const statsDCE = runDCE(blockMap, func);
        if (log) console.info(`${func.name}: DCE: removed ${statsDCE.removedInstructions.length}`);
      }
    }
    const instrs = blockMap2Instructions(blockMap);
    outBril.functions[func.name] = {
      ...func,
      instrs,
    };
    outBril.data = new Map(bril.data);
    outBril.dataSize = bril.dataSize;
    outCfg[func.name] = Object.values(blockMap);
  });
  return { optimBril: outBril, optimCfg: outCfg };
};
