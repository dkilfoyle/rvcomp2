import { IBrilProgram } from "./BrilInterface";
import { lvn } from "./lvn";
import { blockMap2Instructions, getFunctionBlockMap, ICFG } from "./cfg";
import { runDCE } from "./dce";
import { removePhis, runSSA } from "./ssa";
import { gvn } from "./gvn";
import { licm } from "./loops";

export type IBrilOptimisations = "doSSA" | "removePhis" | "doLVN" | "doGVN" | "doDCE" | "doLICM";

export const optimiseBril = (bril: IBrilProgram, optimisations: IBrilOptimisations[], log = false) => {
  const getYN = (t: boolean) => (t ? "Y" : "N");
  const outBril: IBrilProgram = { functions: {}, data: new Map(), dataSize: 0 };
  const outCfg: ICFG = {};
  // if (log && Object.keys(bril.functions).length > 0) console.info(`Optimising: SSA:${doSSA}, LVN:${doLVN}, DCE:${doDCE}`);
  Object.values(bril.functions).forEach((func) => {
    let blockMap = getFunctionBlockMap(func);

    if (Object.keys(blockMap).length > 0) {
      if (log) console.info("Optimising...");
      optimisations.forEach((optim) => {
        switch (optim) {
          case "doSSA":
            const statsSSA = runSSA(blockMap, func);
            if (log) console.info(`${func.name}: SSA: `, statsSSA);
            break;
          case "doLICM":
            blockMap = licm(func, blockMap);
            break;
          case "doLVN":
            const lvnStats = lvn(blockMap);
            if (log) console.info(`${func.name}: LVN: `, lvnStats);
            break;
          case "doGVN":
            const gvnStats = gvn(func, blockMap);
            if (log) console.info(`${func.name}: LVN: `, gvnStats);
            break;
          case "removePhis":
            const statsPhis = removePhis(blockMap);
            break;
          case "doDCE":
            const statsDCE = runDCE(blockMap, func);
            if (log) console.info(`${func.name}: DCE: removed ${statsDCE.removedInstructions.length}`);
            break;
        }
      });
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
