// adapted from https://github.com/johnflanigan/graph-coloring-via-register-allocation

import _ from "lodash";
import { IBrilEffectOperation, IBrilFunction, IBrilParamType, IBrilProgram, IBrilValueInstruction, IBrilValueOperation } from "./BrilInterface";
import { ICFGBlockMap, getCfgEdges, getFunctionBlockMap } from "./cfg";
import { dfWorklist, ANALYSES } from "./df";
import { getDominatorMap, IStringsMap, IStringMap } from "./dom";
import { getBackEdges, getNaturalLoops, getLoopExits, findLoopInvariants, getBasicInductionVars } from "./loops";
import { brilPrinter } from "./BrilPrinter";
import { keycharm } from "vis-network";

interface IVariable {
  reg: string;
  dead: boolean; // will it be dead after this instruction
}

class Instruction {
  public opcode: string = "";
  public dec: IVariable[] = [];
  public use: IVariable[] = [];
  constructor(opcode: string, dec: IVariable[], use: IVariable[]) {
    this.opcode = opcode;
    this.dec = dec;
    this.use = use;
  }
}

class IntermediateLang {
  public instructions: Instruction[] = [];
  constructor(instructions: Instruction[]) {
    this.instructions = instructions;
  }
}

class Graph {
  // { a: ["b","c","f"]} } meaning that a's liveness overlaps with b, c and f's liveness
  public adjacencyList: IStringsMap;
  constructor() {
    this.adjacencyList = {};
  }
  addEdge(x: string, y: string) {
    if (!this.adjacencyList[x]) this.adjacencyList[x] = [];
    if (!this.adjacencyList[y]) this.adjacencyList[y] = [];
    if (!this.adjacencyList[x].includes(y)) this.adjacencyList[x].push(y);
    if (!this.adjacencyList[y].includes(x)) this.adjacencyList[y].push(x);
  }
  hasEdge(x: string, y: string) {
    if (!this.adjacencyList[x]) throw Error("Graph hasEdge");
    return this.adjacencyList[x].includes(y);
  }
  removeNode(x: string) {
    if (this.adjacencyList[x]) delete this.adjacencyList[x];
    Object.keys(this.adjacencyList).forEach((key) => {
      if (this.adjacencyList[key].includes(x)) _.remove(this.adjacencyList[key], (xx) => xx == x);
    });
  }
  renameNode(x: string, newx: string) {
    this.adjacencyList[newx] = _.uniq([...(this.adjacencyList[x] || []), ...(this.adjacencyList[newx] || [])]);
    delete this.adjacencyList[x];
    // replace all references to x in other nodes
    Object.keys(this.adjacencyList).forEach((key) => {
      this.adjacencyList[key] = this.adjacencyList[key].map((node) => (node == x ? newx : node));
    });
  }
  neighbors(x: string) {
    return this.adjacencyList[x] || [];
  }
  plot(coloring: IStringMap) {
    const nodes = Object.keys(this.adjacencyList).map((node) => ({ id: node, label: node, color: coloring[node] || "grey" }));
    const edges: { id: string; from: string; to: string }[] = [];
    Object.keys(this.adjacencyList).forEach((node1) => {
      this.adjacencyList[node1].forEach((node2) => {
        // add this edge if the reverse does not already exist
        if (!edges.find((edge) => edge.from == node2 && edge.to == node1)) edges.push({ id: `${node1}-${node2}`, from: node1, to: node2 });
      });
    });
    return { nodes, edges };
  }
}

const buildIL = (prog: IBrilProgram) => {
  const res: Record<string, IntermediateLang> = {};
  const visitedBlocks: Record<string, boolean> = {};

  Object.values(prog.functions).forEach((f) => {
    const blockMap = getFunctionBlockMap(f);
    const { _in: liveIn, _out: liveOut } = dfWorklist<string[]>(blockMap, ANALYSES["live"]);
    const fInstructions: Instruction[] = [];

    const isDead = (varName: string, blockName: string, pc: number) => {
      // varName is dead if redeclared after pc, or if not used again
      // in this block UNLESS it is used in successor block ie is in this blocks liveOut
      let used = liveOut[blockName].includes(varName);
      let redeclared = false;
      for (let instr of blockMap[blockName].instructions.slice(pc + 1)) {
        if ("dest" in instr && instr.dest == varName) {
          redeclared = true;
          break;
        }
        if ("args" in instr && instr.args?.includes(varName)) {
          used = true;
          break;
        }
      }
      return redeclared || !used;
    };

    const visitBlock = (curBlock: string) => {
      visitedBlocks[curBlock] = true;
      // filter out function parameters, these do not need registers
      // todo: limit SimpleC functions to max 8 parameters
      // const bbLiveIn = curBlock == f.name ? liveIn[curBlock].filter((v) => !f.args.find((a) => a.name == v)) : liveIn[curBlock];
      fInstructions.push({
        opcode: "bb" + curBlock,
        dec: liveIn[curBlock].map((liveVarName) => ({ reg: liveVarName, dead: false })),
        use: [],
      });

      blockMap[curBlock].instructions.forEach((instr, i) => {
        const dec: IVariable[] = [];
        const use: IVariable[] = [];
        if ("dest" in instr) {
          dec.push({ reg: instr.dest, dead: isDead(instr.dest, curBlock, i) });
        }
        if ("args" in instr) {
          instr.args?.forEach((arg) => {
            use.push({ reg: arg, dead: isDead(arg, curBlock, i) });
          });
        }
        if (dec.length || use.length)
          fInstructions.push({
            opcode: brilPrinter.formatInstruction(instr, 0, false),
            dec,
            use,
          });
      });

      blockMap[curBlock].out.forEach((o) => {
        if (!visitedBlocks[o]) visitBlock(o);
      });
    };

    visitBlock(Object.values(blockMap)[0].name);
    res[f.name] = new IntermediateLang(fInstructions);
  });

  return res;
};

const buildGraph = (il: IntermediateLang) => {
  const graph = new Graph();
  // liveness is a variable reference counter
  let liveness: Record<string, number> = {};

  for (let instruction of il.instructions) {
    if (instruction.opcode.startsWith("bb")) {
      // new basic block so reset liveness to liveIn
      liveness = {};
      for (let dec of instruction.dec.filter((d) => !d.dead)) {
        liveness[dec.reg] = (liveness[dec.reg] || 0) + 1;
      }
    } else {
      // decrement reference counter for dead useage, ie this is last use before EOF or redeclare
      for (let use of instruction.use.filter((u) => u.dead)) {
        liveness[use.reg] -= 1;
        if (liveness[use.reg] == 0) delete liveness[use.reg];
      }
      // declaring a var, create an interference edge to all currently live vars
      for (let dec of instruction.dec) {
        for (let liveVar in liveness) {
          if (liveVar !== dec.reg) graph.addEdge(dec.reg, liveVar);
        }
        if (!dec.dead) liveness[dec.reg] = (liveness[dec.reg] || 0) + 1;
      }
    }
  }
  return graph;
};

export const registerAllocation = (prog: IBrilProgram) => {
  const il = buildIL(prog);
  const graph = buildGraph(il["main"]);
  // TODO: do graph coloring for whole program or per function?
  //
  return { graph };
};
