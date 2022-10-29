import { IBrilFunction, IBrilInstruction, IBrilInstructionOrLabel, IBrilLabel, IBrilProgram } from "./BrilInterface";

const TERMINATORS = ["br", "jmp", "ret"];

export interface IControlFlowGraphNode {
  instructions: IBrilInstructionOrLabel[];
  keyStart: number;
  keyEnd: number;
  name: string;
  out: string[];
  level: number;
}

export type ICFG = Map<string, IControlFlowGraphNode[]>;

export class CfgBuilder {
  public program: ICFG = new Map();
  public blocks: IControlFlowGraphNode[] = [];
  public cur_block: IControlFlowGraphNode = this.startBlock({});

  startBlock({ name, level }: { name?: string; level?: number }): IControlFlowGraphNode {
    this.cur_block = { instructions: [], name: name || "", out: [], level: 0, keyStart: -1, keyEnd: -1 };
    return this.cur_block;
  }

  endBlock() {
    this.blocks.push({ ...this.cur_block });
    this.cur_block.instructions = [];
  }

  buildProgram(prog: IBrilProgram) {
    this.program = new Map();
    prog.functions.forEach((fn) => {
      this.program.set(fn.name, this.buildFunction(fn));
    });
    return this.program;
  }

  buildFunction(fn: IBrilFunction) {
    this.blocks = [];
    let level = 0;
    this.startBlock({ name: fn.name, level });

    fn.instrs.forEach((ins) => {
      if ("op" in ins) {
        // its an instruction
        ins = <IBrilInstruction>ins;
        this.cur_block.instructions.push(ins);
        if (TERMINATORS.includes(ins.op)) {
          if (ins.op == "br" && ins.labels) this.cur_block.out = [ins.labels[0], ins.labels[1]];
          if (ins.op == "jmp" && ins.labels) this.cur_block.out = [ins.labels[0]];
          level = level + 1;
          this.endBlock();
        }
      } else {
        ins = <IBrilLabel>ins;
        if (this.cur_block.instructions.length) this.endBlock();
        this.startBlock({ name: ins.label, level });
        this.cur_block.instructions = [ins];
      }
    });
    if (this.cur_block.instructions.length) this.endBlock();

    return this.blocks.map((block) => {
      block.keyStart = block.instructions[0].key || -1;
      block.keyEnd = block.instructions[block.instructions.length - 1].key || -1;
      return block;
    });
  }
}

export const cfgBuilder = new CfgBuilder();
