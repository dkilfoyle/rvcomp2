import { beforeAll, expect, test } from "vitest";
import { cstVisitor } from "../simpleC/cstToAstVisitor";
import { parse } from "../simpleC/parser";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges, ICFG, ICFGBlock, ICFGBlockMap } from "./cfg";
import { getDominanceFrontierMap, getDominanceTree, getDominatorMap, invertMap, postOrder, IStringsMap } from "./dom";
import domCode from "../../examples/ssaif.sc?raw";
import { getBlockToPhiVariablesMap, getVariableDefinitionToBlocksMap, renameVars } from "./ssa";
import { IBrilProgram } from "./BrilInterface";
import { getBrilFunctionArgs, getBrilFunctionVarTypes } from "./utils";

let bril: IBrilProgram;
let cfg: ICFG;
let blockMap: Record<string, ICFGBlock>;
let successors: IStringsMap;
let dominatorMap: IStringsMap;
let dominanceFrontier: IStringsMap;

beforeAll(() => {
  const { cst, lexErrors, parseErrors } = parse(domCode);
  const ast = cstVisitor.go(cst);
  bril = astToBrilVisitor.visit(ast.ast);
  cfg = cfgBuilder.buildProgram(bril);
  blockMap = addCfgEntry(getCfgBlockMap(cfg["main"]));
  addCfgTerminators(blockMap);
  const edges = getCfgEdges(blockMap);
  successors = edges.successorsMap;
  dominatorMap = getDominatorMap(successors, "main");
  dominanceFrontier = getDominanceFrontierMap(dominatorMap, successors);
});

test("getVariableDefinitionToBlocksMap returns array of blocks in which variable (re)defined", () => {
  const mymap = {
    a: ["main", "then.0", "else.0"],
    v1: ["main"],
    v2: ["main"],
    v3: ["then.0"],
    v4: ["else.0"],
  };
  const varmap = getVariableDefinitionToBlocksMap(blockMap);
  expect(varmap).toEqual(mymap);
});

test("getBlockToPhiVariablesMap returns for each block a list of variables that need a phi node", () => {
  const mymap = {
    main: [],
    "then.0": [],
    "else.0": [],
    "endif.0": ["a", "v3", "v4"],
  };
  const defs = getVariableDefinitionToBlocksMap(blockMap);
  const phimap = getBlockToPhiVariablesMap(blockMap, dominanceFrontier, defs);
  expect(phimap).toEqual(mymap);
});

test("renameVars renames vars in instructions and produces correct phiMaps", () => {
  const defs = getVariableDefinitionToBlocksMap(blockMap);
  const phis = getBlockToPhiVariablesMap(blockMap, dominanceFrontier, defs);
  const dom = getDominatorMap(successors, Object.keys(blockMap)[0]);
  const domTree = getDominanceTree(dom);
  const types = getBrilFunctionVarTypes(bril.functions.main);
  const args = getBrilFunctionArgs(bril.functions.main);
  const phiMaps = renameVars(blockMap, phis, successors, domTree, args);
  console.log(phiMaps);
});

// test("postOrder returns tree in post order", () => {
//   const succmap = {
//     a: ["b"],
//     b: ["c", "d"],
//     c: ["e", "f"],
//     d: ["g", "h"],
//     e: [],
//     f: [],
//     g: [],
//     h: [],
//   };
//   expect(postOrder(succmap, "a")).toEqual(["e", "f", "c", "g", "h", "d", "b", "a"]);
// });

// test("dom works", () => {
//   let blockMap = getCfgBlockMap(cfg["main"]);
//   blockMap = addCfgEntry(blockMap);
//   addCfgTerminators(blockMap);
//   const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);

//   const ordered = (inmap: IStringsMap) =>
//     Object.keys(inmap)
//       .sort()
//       .reduce((obj: IStringsMap, key) => {
//         obj[key] = inmap[key].sort();
//         return obj;
//       }, {});

//   const dom = getDominatorMap(successorsMap, "entry1");
//   const answer = {
//     entry1: ["entry1"],
//     "whilebody.0": ["entry1", "whilebody.0", "whiletest.0"],
//     "whiletest.0": ["entry1", "whiletest.0"],
//     "whileend.0": ["entry1", "whiletest.0", "whileend.0"],
//   };

//   expect(ordered(dom)).toEqual(ordered(answer));
// });
