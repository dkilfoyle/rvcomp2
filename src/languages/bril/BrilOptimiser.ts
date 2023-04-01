import { IBrilProgram } from "./BrilInterface";
import { lvn } from "./lvn";
import { blockMap2Instructions, getFunctionBlockMap, ICFG } from "./cfg";
import { runDCE } from "./dce";
import { removePhis, runSSA } from "./ssa";
import { gvn } from "./gvn";
import { licm_sr } from "./loops";
import { unrollLoops } from "./unroll";

export type IBrilOptimisations = "doSSA" | "removePhis" | "doLVN" | "doGVN" | "doDCE" | "doLICM";

export const optimiseBril = (bril: IBrilProgram, optimisations: string[], logger?: Console) => {
  const getYN = (t: boolean) => (t ? "Y" : "N");
  const outBril: IBrilProgram = { functions: {}, data: new Map(), dataSize: 0 };
  const outCfg: ICFG = {};
  // if (log && Object.keys(bril.functions).length > 0) console.info(`Optimising: SSA:${doSSA}, LVN:${doLVN}, DCE:${doDCE}`);
  if (logger) logger.info("Optimising...");
  Object.values(bril.functions).forEach((func) => {
    let blockMap = getFunctionBlockMap(func);

    if (optimisations.length == 0) if (logger) logger.info(` - No optimisations`);

    if (Object.keys(blockMap).length > 0) {
      optimisations.forEach((optim) => {
        switch (optim) {
          case "Unroll":
            const unrollResult = unrollLoops(func, blockMap);
            blockMap = unrollResult.blockMap;
            console.log(blockMap);
            if (logger) logger.info(` - ${func.name}: Unroll: `, unrollResult.stats);
            break;
          case "SSA":
            const statsSSA = runSSA(blockMap, func);
            if (logger) logger.info(` - ${func.name}: SSA: `, statsSSA);
            break;
          case "LICM&SR":
            const licmResult = licm_sr(func, blockMap);
            blockMap = licmResult.blockMap;
            if (logger) logger.info(` - ${func.name}: LICM&SR: `, licmResult.stats);
            break;
          case "LVN":
            const lvnStats = lvn(blockMap);
            if (logger) logger.info(` - ${func.name}: LVN: `, lvnStats);
            break;
          case "GVN":
            const gvnStats = gvn(func, blockMap);
            if (logger) logger.info(` - ${func.name}: GVN: `, gvnStats);
            break;
          case "Phis-":
            const statsPhis = removePhis(blockMap);
            break;
          case "DCE":
            const dceStats = runDCE(blockMap, func);
            if (logger) logger.info(` - ${func.name}: DCE: `, dceStats);
            break;
          default:
            throw new Error(`Unknown optimisation  ${optim}`);
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
