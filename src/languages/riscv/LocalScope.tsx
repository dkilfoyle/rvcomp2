import _ from "lodash";
import { IBrilFunction } from "../bril/BrilInterface";
import { WORD_SIZE } from "./brilToRV32";
import { ScopeStack } from "./scopeStack";

export interface LocalScope {
  FP: number; // the SP at the entry point of the block
  SP: number; // positive or negative offset from *local* FP
  // if the scope is at function level then
  // a. stack grows positive from 0(FP) for function arguments
  // b. stack grows negative from -8(FP) for function locals
  // otherwise stack grows negative from 0(FP)
}

export interface LocalVariable {
  spoffset?: number;
  fpoffset: number;
  size: number;
}

export class LocalScopeStack extends ScopeStack<LocalVariable, LocalScope> {
  reset() {
    this.scopes.length = 0;
    this.enterScope("topLevel", { FP: 0, SP: 0 });
  }
  pushFunctionParams(node: IBrilFunction) {
    // FP+8    Arg2
    // FP+4    Arg1
    // FP+0 -> Arg0
    node.args.forEach((p, i) => {
      this.newSymbol(p.name, { fpoffset: i * WORD_SIZE, size: WORD_SIZE });
    });
  }
  pushLocal(name: string, size: number) {
    // myfun() {
    //   int x = 10;
    //   int y = 5;
    //   while (x>0) {
    //     int z = 2;
    //     x = x - 1;
    //     print_int(x);
    //   }
    // }
    // FP+0  Arg0
    // FP-4  CallerFP
    // FP-8  RA             BlockFP =-8 (enterFunction FP=-8)
    // FP-12 Local0         BlockSP =-4  offset=-8-4=-12           int x = 10;
    // FP-16 Local1         BlockSP =-8  offset=-8-8=-16           int y = 5;
    //                        BlockFP = -16 (enterBlock FP = topFP + topSP = -8 + -8 = -16)
    // FP-20   Local0         BlockSP = -4  offset=-16-4=-20       int z = 2;
    const top = this.top();
    if (!top.context) throw Error();
    top.context.SP -= size;
    const localVar = { spoffset: top.context.SP, fpoffset: top.context.FP + top.context.SP, size };
    this.newSymbol(name, localVar);
    return localVar;
  }
  popLocal() {
    const top = this.top();
    if (!top.context) throw Error();
    const lastKey = Object.keys(top.entries)[Object.keys(top.entries).length - 1];
    top.context.SP += this.getLocalVarOffset(lastKey).size;
    delete top.entries[lastKey];
  }
  getLocalVarOffset(id: string) {
    const [found, localVar] = this.getSymbol(id);
    if (!found) throw new Error();
    if (_.isUndefined(localVar)) throw Error();
    return localVar;
  }
  enterFunction(name: string) {
    // Caller function                Callee function
    // a0
    // a1
    // an     SP                      FP
    //                                RA
    //                                FP of caller           SP = -8 relative to FP
    //

    const parentContext = this.top().context;
    if (!parentContext) throw Error();
    return this.enterScope(`function ${name}`, { FP: parentContext.SP, SP: -2 * WORD_SIZE });
  }
  enterBlock(name: string) {
    const parentContext = this.top().context;
    if (!parentContext) throw Error();
    return this.enterScope(name, { FP: parentContext.FP + parentContext.SP, SP: 0 });
  }
}
