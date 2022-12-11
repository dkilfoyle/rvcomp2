import _ from "lodash";
import { IBrilEffectOperation, IBrilFunction, IBrilInstruction, IBrilInstructionOrLabel, IBrilLabel, IBrilProgram } from "./BrilInterface";

const TERMINATORS = ["br", "jmp", "ret"];

export interface ICFGBlock {
  instructions: IBrilInstructionOrLabel[];
  keyStart: number;
  keyEnd: number;
  name: string;
  out: string[];
  level: number;
}

export type ICFG = Record<string, ICFGBlock[]>;
export type ICFGBlockMap = Record<string, ICFGBlock>;

export class CfgBuilder {
  public program: ICFG = {};
  public blocks: ICFGBlock[] = [];
  public cur_block: ICFGBlock = this.startBlock({});
  public curFn: string = "";
  public curNameIndex: number = 0;

  startBlock({ name, level }: { name?: string; level?: number }): ICFGBlock {
    this.cur_block = { instructions: [], name: name || `${this.curFn}_${this.curNameIndex++}`, out: [], level: 0, keyStart: -1, keyEnd: -1 };
    return this.cur_block;
  }

  endBlock() {
    this.blocks.push({ ...this.cur_block });
    this.cur_block.instructions = [];
  }

  buildProgram(prog: IBrilProgram) {
    this.program = {};
    Object.values(prog.functions).forEach((fn) => {
      this.program[fn.name] = this.buildFunction(fn);
    });
    return this.program;
  }

  buildFunction(fn: IBrilFunction) {
    this.blocks = [];
    let level = 0;
    this.curFn = fn.name;
    this.curNameIndex = 0;
    this.startBlock({ name: fn.name, level });

    fn.instrs.forEach((ins) => {
      if ("op" in ins) {
        // its an instruction
        ins = <IBrilInstruction>ins;
        this.cur_block.instructions.push({ ...ins });
        if (TERMINATORS.includes(ins.op)) {
          if (ins.op == "br" && ins.labels) {
            this.cur_block.out = [ins.labels[0], ins.labels[1]];
            // if branching to a block that doesnt exist yet increase the level
            if (!_.map(this.blocks, "name").includes(ins.labels[0]) || !_.map(this.blocks, "name").includes(ins.labels[1])) level++;
          }
          if (ins.op == "jmp" && ins.labels) {
            this.cur_block.out = [ins.labels[0]];
            // if branching to a block that doesnt exist yet increase the level for that next block
            if (!_.map(this.blocks, "name").includes(ins.labels[0])) level++;
          }
          this.endBlock();
        }
      } else {
        ins = <IBrilLabel>ins;
        if (this.cur_block.out.length == 0) this.cur_block.out = [ins.label];
        if (this.cur_block.instructions.length) this.endBlock();
        this.startBlock({ name: ins.label, level });
        this.cur_block.keyStart = ins.key || -1;
        this.cur_block.instructions = [ins];
      }
    });
    if (this.cur_block.instructions.length) this.endBlock();

    return this.blocks.map((block, i) => {
      if (block.keyStart == -1) block.keyStart = block.instructions[0].key || -1;
      block.keyEnd = block.instructions[block.instructions.length - 1].key || -1;

      return block;
    });
  }
}

export const cfgBuilder = new CfgBuilder();

export const addCfgEntry = (blockMap: ICFGBlockMap) => {
  // ensure that the first block has no predecessors
  // this could happen if jmp or br back to first block

  const blocks = Object.values(blockMap);
  const firstLabel = blocks[0].name;
  const hasInEdge = flattenCfgBlocks(blocks).find((instr) => {
    return "labels" in instr && (instr as IBrilEffectOperation).labels?.includes(firstLabel);
  });

  if (!hasInEdge) return blockMap;

  // inedge exists, insert a new entry block
  const newLabel = fresh(
    "entry",
    blocks.map((block) => block.name)
  );

  return {
    [newLabel]: { name: newLabel, instructions: [], out: [blocks[0].name], keyEnd: -1, keyStart: -1, level: 0 } as ICFGBlock,
    ...blockMap,
  };
};

export const addCfgTerminators = (blockMap: ICFGBlockMap) => {
  // add terminators if required
  const blocks = Object.values(blockMap);
  blocks.forEach((block, i) => {
    if (i == blocks.length - 1) {
      // last block in fn
      if (block.instructions.length == 0) block.instructions.push({ op: "ret", args: [] });
      else {
        const lastIns = block.instructions[block.instructions.length - 1] as IBrilInstruction;
        if (["br", "jmp", "ret"].includes(lastIns.op) === false) block.instructions.push({ op: "ret", args: [] });
      }
    } else {
      // not last block, so if not explicity terminated then jmp to next block
      const dest = blocks[i + 1].name;

      if (block.instructions.length == 0) block.instructions.push({ op: "jmp", labels: [dest] });
      else {
        const lastIns = block.instructions[block.instructions.length - 1] as IBrilInstruction;
        if (["br", "jmp", "ret"].includes(lastIns.op) === false) block.instructions.push({ op: "jmp", labels: [dest] });
      }
    }
  });
};

export const getCfgBlockMap = (blocks: ICFGBlock[]) => {
  blocks.forEach((block, index) => {
    if ("label" in block.instructions[0]) {
      blocks[index].name = block.instructions[0].label;
      blocks[index].instructions.shift();
    }
  });
  return blocks.reduce((accum: Record<string, ICFGBlock>, block) => {
    accum[block.name] = block;
    return accum;
  }, {});
};

export const getCfgEdges = (blockMap: ICFGBlockMap) => {
  const predecessorsMap: Record<string, string[]> = {};
  const successorsMap: Record<string, string[]> = {};
  Object.entries(blockMap).forEach(([name, block]) => {
    const succs = getInstructionSuccessors(block.instructions.at(-1));
    if (!successorsMap[name]) successorsMap[name] = [];

    succs?.forEach((succ) => {
      if (!predecessorsMap[succ]) predecessorsMap[succ] = [];
      successorsMap[name].push(succ);
      predecessorsMap[succ].push(name);
    });
  });
  return { predecessorsMap, successorsMap };
};

export const getInstructionSuccessors = (ins?: IBrilInstructionOrLabel) => {
  if (!ins) return [];
  if ("label" in ins) throw new Error();
  if (["jmp", "br"].includes(ins.op)) return (ins as IBrilEffectOperation).labels;
  if (ins.op == "ret") return [];
  throw new Error("ins is not a terminator");
};

export const flattenCfgBlocks = (blocks: ICFGBlock[]) => {
  // TODO:
  // 1 Remove ret intructions if last block
  // 2 Remove jmp instructions if jmp to immediate next block
  return blocks.map((block) => block.instructions).flat();
};

export const fresh = (seed: string, names: string[]) => {
  let i = 1;
  while (true) {
    if (!names.includes(seed + i)) return seed + i;
    i = i + 1;
  }
};

export const blockMap2Instructions = (blockMap: ICFGBlockMap) => {
  const instrs: IBrilInstructionOrLabel[] = [];
  Object.values(blockMap).forEach((block) => {
    instrs.push({ label: block.name } as IBrilLabel);
    instrs.push(...block.instructions);
  });
  return instrs;
};
