import { expect, test } from "vitest";
import { cstVisitor } from "../simpleC/cstToAstVisitor";
import { parse } from "../simpleC/parser";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges } from "./cfg";
import { getDominatorMap, invertMap, postOrder, IStringsMap } from "./dom";
import domCode from "../../examples/dom.sc?raw";

test("invertMap inverts string array maps", () => {
  const mymap = {
    a: ["x", "y", "z"],
    b: ["i", "j", "x"],
  };
  const invertedmaymap = invertMap(mymap);
  expect(invertedmaymap).toEqual({ a: [], b: [], x: ["a", "b"], y: ["a"], z: ["a"], i: ["b"], j: ["b"] });
});

test("postOrder returns tree in post order", () => {
  const succmap = {
    a: ["b"],
    b: ["c", "d"],
    c: ["e", "f"],
    d: ["g", "h"],
    e: [],
    f: [],
    g: [],
    h: [],
  };
  expect(postOrder(succmap, "a")).toEqual(["e", "f", "c", "g", "h", "d", "b", "a"]);
});

test("dom works", () => {
  const { cst, lexErrors, parseErrors } = parse(domCode);
  const ast = cstVisitor.go(cst);
  const bril = astToBrilVisitor.visit(ast.ast);
  const cfg = cfgBuilder.buildProgram(bril);
  let blockMap = addCfgEntry(getCfgBlockMap(cfg["main"]));
  addCfgTerminators(blockMap);
  const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);

  const ordered = (inmap: IStringsMap) =>
    Object.keys(inmap)
      .sort()
      .reduce((obj: IStringsMap, key) => {
        obj[key] = inmap[key].sort();
        return obj;
      }, {});

  const dom = getDominatorMap(successorsMap, "entry1");
  const answer = {
    entry1: ["entry1"],
    "whilebody.0": ["entry1", "whilebody.0", "whiletest.0"],
    "whiletest.0": ["entry1", "whiletest.0"],
    "whileend.0": ["entry1", "whiletest.0", "whileend.0"],
  };

  expect(ordered(dom)).toEqual(ordered(answer));
});
