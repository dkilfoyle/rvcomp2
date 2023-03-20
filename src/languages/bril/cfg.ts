import _ from "lodash";
import { l } from "vitest/dist/index-9f5bc072";
import { IBrilEffectOperation, IBrilFunction, IBrilInstruction, IBrilInstructionOrLabel, IBrilLabel, IBrilProgram } from "./BrilInterface";

const TERMINATORS = ["br", "jmp", "ret"];

export interface ICFGBlock {
  instructions: IBrilInstruction[];
  keyStart: number;
  keyEnd: number;
  name: string;
  out: string[];
  live: string[];
  defined: string[];
}

export type ICFG = Record<string, ICFGBlock[]>;
export type ICFGBlockMap = Record<string, ICFGBlock>;

export class CfgBuilder {
  public program: ICFG = {};
  public blocks: ICFGBlock[] = [];
  public cur_block: ICFGBlock = this.startBlock({});
  public curFn: string = "";
  public curNameIndex: number = 0;

  startBlock({ name }: { name?: string }): ICFGBlock {
    this.cur_block = {
      instructions: [],
      name: name || `${this.curFn}_${this.curNameIndex++}`,
      out: [],
      keyStart: -1,
      keyEnd: -1,
      live: [],
      defined: [],
    };
    return this.cur_block;
  }

  endBlock() {
    if (this.cur_block.name == "") console.error("Blockname is empty: ", this.cur_block);
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
    this.curFn = fn.name;
    this.curNameIndex = 0;
    this.startBlock({ name: fn.name });

    fn.instrs.forEach((ins, i) => {
      if ("op" in ins) {
        // its an instruction
        ins = <IBrilInstruction>ins;
        this.cur_block.instructions.push({ ...ins });
        if (TERMINATORS.includes(ins.op)) {
          if (ins.op == "br" && ins.labels) {
            this.cur_block.out = [ins.labels[0], ins.labels[1]];
          }
          if (ins.op == "jmp" && ins.labels) {
            this.cur_block.out = [ins.labels[0]];
          }
          this.endBlock();
          this.cur_block.name = "";
        }
      } else {
        ins = <IBrilLabel>ins;
        if (i != 0) {
          // if i == 0 then don't create a block as already done
          if (this.cur_block.out.length == 0) this.cur_block.out = [ins.label];
          if (this.cur_block.name != "") this.endBlock();
          // if (this.cur_block.instructions.length) this.endBlock();
          this.startBlock({ name: ins.label });
        }
        if (_.isUndefined(ins.key)) debugger;
        else this.cur_block.keyStart = ins.key;
        // this.cur_block.instructions = [ins];
      }
    });
    if (this.cur_block.name != "") this.endBlock();

    return this.blocks.map((block, i) => {
      // if (!block.instructions.length) debugger;

      // if (block.keyStart == -1) block.keyStart = block.instructions[0].key || -1;
      if (block.instructions.length == 0) block.keyEnd = block.keyStart;
      else block.keyEnd = block.instructions[block.instructions.length - 1].key || -1;

      return block;
    });
  }
}

export const cfgBuilder = new CfgBuilder();

export const addCfgEntry = (blockMap: ICFGBlockMap) => {
  // ensure that the first block has no predecessors
  // this could happen if jmp or br back to first block

  const blocks = Object.values(blockMap);
  if (blocks.length == 0) return blockMap;
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

  // console.log(`Adding label ${newLabel} before block ${blocks[0].name}`);

  return {
    [newLabel]: { name: newLabel, instructions: [], out: [blocks[0].name], keyEnd: -1, keyStart: -1, live: [], defined: [] } as ICFGBlock,
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

      if (block.instructions.length == 0) {
        block.instructions.push({ op: "jmp", labels: [dest] });
        console.log(`Adding jmp ${dest} to block ${block.name}`);
      } else {
        const lastIns = block.instructions[block.instructions.length - 1] as IBrilInstruction;
        if (["br", "jmp", "ret"].includes(lastIns.op) === false) {
          // console.log(`Adding jmp ${dest} to block ${block.name}`);
          block.instructions.push({ op: "jmp", labels: [dest] });
        }
      }
    }
  });
};

export const getCfgBlockMap = (blocks: ICFGBlock[]) => {
  // blocks.forEach((block, index) => {
  //   if ("label" in block.instructions[0]) {
  //     blocks[index].name = block.instructions[0].label;
  //     blocks[index].instructions.shift();
  //   }
  // });
  return blocks.reduce((accum: Record<string, ICFGBlock>, block) => {
    accum[block.name] = block;
    return accum;
  }, {});
};

export const getCfgEdges = (blockMap: ICFGBlockMap) => {
  const predecessorsMap: Record<string, string[]> = {};
  const successorsMap: Record<string, string[]> = {};
  Object.entries(blockMap).forEach(([name, block], iBlock) => {
    let succs;
    try {
      succs = getInstructionSuccessors(block.instructions.at(-1));
    } catch (e: any) {
      // no terminator, instead use next block
      succs = [Object.keys(blockMap)[iBlock + 1]];
    }
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
  let instrKey = 0;
  Object.keys(blockMap).forEach((blockName) => {
    blockMap[blockName].keyStart = instrKey;
    instrs.push({ label: blockName, key: instrKey++ } as IBrilLabel);
    instrs.push(...blockMap[blockName].instructions.map((i) => ({ ...i, key: instrKey++ })));
    blockMap[blockName].keyEnd = instrKey - 1;
  });
  return instrs;
};

export const getFunctionBlockMap = (func: IBrilFunction) => {
  let blockMap = addCfgEntry(getCfgBlockMap(cfgBuilder.buildFunction(func)));
  addCfgTerminators(blockMap);
  return blockMap;
};
