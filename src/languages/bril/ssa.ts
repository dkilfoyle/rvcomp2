import _ from "lodash";
import { IBrilFunction, IBrilValueOperation } from "./BrilInterface";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges, ICFGBlock, ICFGBlockMap } from "./cfgBuilder";
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
  Object.keys(blockMap).forEach((b) => phis[b].forEach((p) => (phiArgs[b] = { [p]: [] })));

  // { block: { x : "x.3" }}
  // x.3: int = phi ....
  const phiDests: IPhiDests = {};
  Object.keys(blockMap).forEach((b) => phis[b].forEach((p) => (phiDests[b] = { [p]: undefined })));

  const counters: Record<string, number> = {};

  const _pushFresh = (varName: string) => {
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
      if ("args" in instr) {
        // read off bottom (most recent end) of the stack for arg [v.3, v.2, v.1]
        const newArgs = instr.args?.map((arg) => stack[arg][0]);
        instr.args = newArgs;
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
    domtree[b].sort().forEach((bb) => _rename(bb));

    // restore stack
    stack = _.cloneDeep(oldStack);
  };

  _rename(Object.keys(blockMap)[0]);

  // phiDests = { block: { x : "x.3" }}
  // phiArgs =  { phiblock: { x: [ [x.1, branchLeft], [x.2, branchRight] ] }}
  return { phiDests, phiArgs };
};

export const insertPhis = (blockMap: ICFGBlockMap, phiDests: IPhiDests, phiArgs: IPhiArgs, types: IDictString) => {
  Object.keys(blockMap).forEach((b) => {
    Object.keys(phiArgs[b])
      .sort()
      .forEach((p) => {
        const phi = {
          op: "phi",
          dest: phiDests[b][p],
          type: types[p],
          labels: phiArgs[b][p].map((a) => a[0]),
          args: phiArgs[b][p].map((a) => a[1]),
        } as IBrilValueOperation;
        console.log(`Created phi in block ${b}`, phi);
        blockMap[b].instructions.unshift(phi);
      });
  });
};

export const toSSA = (func: IBrilFunction) => {
  let blockMap = addCfgEntry(getCfgBlockMap(cfgBuilder.buildFunction(func)));
  addCfgTerminators(blockMap);
  const edges = getCfgEdges(blockMap);
  const successors = edges.successorsMap;
  const dom = getDominatorMap(successors, Object.keys(blockMap)[0]);
  const domTree = getDominanceTree(dom);

  const df = getDominanceFrontierMap(dom, successors);
  const defs = getVariableDefinitionToBlocksMap(blockMap);
  const types = getBrilFunctionVarTypes(func);
  const argNames = getBrilFunctionArgs(func);

  const phis = getBlockToPhiVariablesMap(blockMap, df, defs);
  const phiMaps = renameVars(blockMap, phis, successors, domTree, argNames);
  insertPhis(blockMap, phiMaps.phiDests, phiMaps.phiArgs, types);

  console.log("SSA blockmap: ", blockMap);
  return blockMap;
};

// def func_to_ssa(func):
//     blocks = block_map(form_blocks(func['instrs']))
//     add_entry(blocks)
//     add_terminators(blocks)
//     succ = {name: successors(block[-1]) for name, block in blocks.items()}
//     dom = get_dom(succ, list(blocks.keys())[0])

//     df = dom_fronts(dom, succ)
//     defs = def_blocks(blocks)
//     types = get_types(func)
//     arg_names = {a['name'] for a in func['args']} if 'args' in func else set()

//     phis = get_phis(blocks, df, defs)
//     phi_args, phi_dests = ssa_rename(blocks, phis, succ, dom_tree(dom),
//                                      arg_names)
//     insert_phis(blocks, phi_args, phi_dests, types)

//     func['instrs'] = reassemble(blocks)
