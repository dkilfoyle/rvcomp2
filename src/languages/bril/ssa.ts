import _ from "lodash";
import { IBrilFunction, IBrilValueOperation } from "./BrilInterface";
import { getCfgEdges, ICFGBlockMap } from "./cfgBuilder";
import { getDominanceFrontierMap, getDominanceTree, getDominatorMap, stringMap } from "./dom";
import { getBrilFunctionArgs, getBrilFunctionVarTypes, IDictString, IDictStrings } from "./utils";

type IPhiArgs = Record<string, Record<string, [string, string][]>>;
type IPhiDests = Record<string, Record<string, string | undefined>>;

export const getVariableDefinitionToBlocksMap = (blocks: ICFGBlockMap) => {
  const out: stringMap = {};
  Object.values(blocks).forEach((b) => {
    b.instructions.forEach((instr) => {
      if ("dest" in instr) {
        if (!out[instr.dest]) out[instr.dest] = [];
        out[instr.dest] = _.union(out[instr.dest], [b.name]);
      }
    });
  });
  // { var: [blocks with var = ...]}
  return out;
};

export const getBlockToPhiVariablesMap = (blocks: ICFGBlockMap, df: stringMap, defs: stringMap) => {
  // df = dominance frontier map
  // defs = variable definition to blocks map
  const phis: stringMap = {};
  Object.keys(blocks).forEach((b) => (phis[b] = []));

  Object.entries(defs).forEach(([v, vdefBlocks]) => {
    // v = var, vdefs = blocks with v =
    let vdefBlocks2 = [...vdefBlocks];
    for (let i = 0; i < vdefBlocks2.length; i++) {
      // vdb is a block in which v is defined
      const vdb = vdefBlocks2[i];
      df[vdb].forEach((dfb) => {
        // dfb is a block in d's dominance frontier
        phis[dfb] = _.union(phis[dfb], [v]);
        if (!vdefBlocks2.includes(dfb)) vdefBlocks2.push(dfb);
      });
    }
  });
  // { block: [vars that need phi in block]}
  return phis;
};

export const renameVars = (blockMap: ICFGBlockMap, phis: IDictStrings, succs: IDictStrings, domtree: IDictStrings, args: string[]) => {
  // {var: [var.1, var.2, var.3]}
  let stack: IDictStrings = {};
  args.forEach((arg) => (stack[arg] = [arg]));

  // { phiblock: { x: [ [x.1, branchLeft], [x.2, branchRight] ] }}
  // ... = phi x.1, x.2, branchLeft, branchRight
  const phiArgs: IPhiArgs = {};
  Object.keys(blockMap).forEach((b) => {
    if (!phiArgs[b]) phiArgs[b] = {};
    phis[b].forEach((p) => (phiArgs[b][p] = []));
  });

  // { block: { x : "x.3" }}
  // x.3: int = phi ....
  const phiDests: IPhiDests = {};
  Object.keys(blockMap).forEach((b) => {
    if (!phiDests[b]) phiDests[b] = {};
    phis[b].forEach((p) => (phiDests[b][p] = undefined));
  });

  const counters: Record<string, number> = {};

  const _pushFresh = (varName: string) => {
    // first encounter of varName so init dicts
    if (!counters[varName]) counters[varName] = 0;
    if (!stack[varName]) stack[varName] = [];
    const fresh = `${varName}.${counters[varName]}`;
    counters[varName]++;
    stack[varName].unshift(fresh);
    return fresh;
  };

  const _rename = (b: string) => {
    const oldStack = _.cloneDeep(stack);
    // rename phi-node dests
    phis[b].forEach((p) => (phiDests[b][p] = _pushFresh(p)));
    // rename instruction args
    blockMap[b].instructions.forEach((instr) => {
      // rename instruction arguments
      if ("args" in instr) {
        // read off bottom (most recent end) of the stack for arg [v.3, v.2, v.1]
        const newArgs = instr.args?.map((arg) => {
          if (!stack[arg]) debugger;
          return stack[arg][0];
        });
        instr.args = newArgs;
      }
      // rename instruction dests
      if ("dest" in instr) {
        instr.dest = _pushFresh(instr.dest);
      }
    });

    // Rename phi-node arguments (in successors).
    // phi_args[succ][x] = [b, x.3]
    succs[b].forEach((s) =>
      phis[s].forEach((p) => {
        if (stack[p]) phiArgs[s][p].push([b, stack[p][0]]);
        else phiArgs[s][p].push([b, "__undefined"]);
      })
    );

    // recurse
    [...domtree[b]].reverse().forEach((bb) => _rename(bb));

    // restore stack
    stack = _.cloneDeep(oldStack);
  };

  _rename(Object.keys(blockMap)[0]);

  // phiDests = { block: { x : "x.3" }}
  // phiArgs =  { phiblock: { x: [ [x.1, branchLeft], [x.2, branchRight] ] }}
  return { phiDests, phiArgs };
};

export const insertPhis = (blockMap: ICFGBlockMap, phiDests: IPhiDests, phiArgs: IPhiArgs, types: IDictString) => {
  let phiCount = 0;
  Object.keys(blockMap).forEach((b) => {
    Object.keys(phiArgs[b])
      .sort()
      .forEach((p) => {
        phiCount++;
        const phi = {
          op: "phi",
          dest: phiDests[b][p],
          type: types[p],
          labels: phiArgs[b][p].map((a) => a[0]),
          args: phiArgs[b][p].map((a) => a[1]),
        } as IBrilValueOperation;
        // console.info(`SSA: Created phi in block ${b}`, phi);
        blockMap[b].instructions.unshift(phi);
      });
  });
  return phiCount;
};

export const removePhis = (blockMap: ICFGBlockMap) => {
  Object.values(blockMap).forEach((block) => {
    block.instructions.forEach((instr) => {
      if ("op" in instr && instr.op == "phi") {
        // x = phi x.1 x.2 left right
        // args=[x.1, x.2]
        // labels=[left,right] where left,right are immed predecessors of current block
        instr.labels?.forEach((label, i) => {
          const varName = instr.args[i];
          // insert x = x.1 or x.2 just before terminator of left or right
          // blockMap[left].instructions[-2] = {op:"id", dest: "x", args: ["x.1"]}
          blockMap[label].instructions.splice(-1, 0, {
            op: "id",
            dest: instr.dest,
            args: [varName],
            type: instr.type,
          } as IBrilValueOperation);
        });
      }
    });
    block.instructions = block.instructions.filter((instr) => "op" in instr && instr.op != "phi");
  });
};

export const runSSA = (blockMap: ICFGBlockMap, func: IBrilFunction) => {
  const edges = getCfgEdges(blockMap);
  const successors = Object.keys(edges.successorsMap)
    .reverse()
    .reduce((accum, cur) => {
      accum[cur] = edges.successorsMap[cur];
      return accum;
    }, {} as Record<string, string[]>);
  const dom = getDominatorMap(successors, Object.keys(blockMap)[0]);
  const domTree = getDominanceTree(dom);

  const df = getDominanceFrontierMap(dom, successors);
  const defs = getVariableDefinitionToBlocksMap(blockMap);
  const types = getBrilFunctionVarTypes(func);
  const argNames = getBrilFunctionArgs(func);
  const phis = getBlockToPhiVariablesMap(blockMap, df, defs);

  // console.log("blockNames", Object.keys(blockMap));
  // console.log("succs", successors);
  // console.log("dom", dom);
  // console.log("df", df);
  // console.log("defs", defs);
  // console.log("phis", phis);

  const phiMaps = renameVars(blockMap, phis, successors, domTree, argNames);
  const phiCount = insertPhis(blockMap, phiMaps.phiDests, phiMaps.phiArgs, types);
  return { phiCount };
};
